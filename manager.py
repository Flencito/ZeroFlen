#!/usr/bin/env python3
"""
ZeroFlen v0.2 - Backend unificado
Sirve archivos estáticos y API REST para el sistema de observadores.
Sin dependencias externas (solo librería estándar).
"""

import json
import os
import sys
import time
from datetime import date, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import socketserver

# ------------------------------------------------------------
# Configuración
# ------------------------------------------------------------
HOST = 'localhost'
PORT = 8000
DATA_FILE = 'data.json'
OBSERVERS_FILE = 'observers.json'

# ------------------------------------------------------------
# TimeKeeper: cálculo de días transcurridos
# ------------------------------------------------------------
class TimeKeeper:
    START_DATE = date(2026, 2, 16)

    @classmethod
    def get_days_elapsed(cls) -> int:
        today = date.today()
        delta = today - cls.START_DATE
        return delta.days + 1

# ------------------------------------------------------------
# FinanceManager: gestión del presupuesto
# ------------------------------------------------------------
class FinanceManager:
    INITIAL_BUDGET = 20.00
    EXPENSES = [
        {"concept": "Dominio Namecheap", "amount": 6.79},
        {"concept": "X Premium", "amount": 2.50},
    ]

    @classmethod
    def get_financials(cls) -> dict:
        invested = sum(item["amount"] for item in cls.EXPENSES)
        remaining = round(cls.INITIAL_BUDGET - invested, 2)
        return {
            "initial": cls.INITIAL_BUDGET,
            "invested": invested,
            "remaining": remaining,
            "status": "PROTECTED",
        }

# ------------------------------------------------------------
# LogSystem: bitácora de eventos
# ------------------------------------------------------------
class LogSystem:
    @staticmethod
    def generate_logs() -> list:
        today_str = date.today().isoformat()
        return [
            {
                "timestamp": f"{today_str} 10:00",
                "id": "001",
                "msg": "Dominio registrado en Namecheap ($6.79)",
            },
            {
                "timestamp": f"{today_str} 10:05",
                "id": "002",
                "msg": "Infraestructura v0.1 configurada ($2.50)",
            },
            {
                "timestamp": f"{today_str} 10:10",
                "id": "003",
                "msg": "Núcleo Desacoplado implementado",
            },
        ]

# ------------------------------------------------------------
# Construcción del objeto data.json
# ------------------------------------------------------------
def build_data():
    days = TimeKeeper.get_days_elapsed()
    financials = FinanceManager.get_financials()
    logs = LogSystem.generate_logs()

    data = {
        "version": "0.2-nucleus",
        "days_elapsed": days,
        "financials": financials,
        "logs": logs,
        "evolution_state": "Núcleo estable v0.2 - Gatekeeper activo",
    }
    return data

def save_data():
    data = build_data()
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"[{time.strftime('%H:%M:%S')}] data.json actualizado")

# ------------------------------------------------------------
# Gestión de observadores (JSON)
# ------------------------------------------------------------
def load_observers():
    if not os.path.exists(OBSERVERS_FILE):
        return []
    with open(OBSERVERS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_observers(observers):
    with open(OBSERVERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(observers, f, indent=2, ensure_ascii=False)

def find_observer(name):
    observers = load_observers()
    for obs in observers:
        if obs['name'] == name:
            return obs
    return None

def add_observer(name, color, country):
    observers = load_observers()
    # Verificar que no exista
    for obs in observers:
        if obs['name'] == name:
            return False
    new_obs = {
        'name': name,
        'color': color,
        'country': country,
        'accesses': 1,
        'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'last_access': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }
    observers.append(new_obs)
    save_observers(observers)
    return True

def increment_access(name):
    observers = load_observers()
    for obs in observers:
        if obs['name'] == name:
            obs['accesses'] += 1
            obs['last_access'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            save_observers(observers)
            return obs['accesses']
    return None

def get_ranking():
    observers = load_observers()
    # Ordenar por accesos descendente
    sorted_obs = sorted(observers, key=lambda x: x['accesses'], reverse=True)
    # Asignar rango
    ranking = []
    for idx, obs in enumerate(sorted_obs):
        ranking.append({
            'rank': idx + 1,
            'name': obs['name'],
            'color': obs['color'],
            'country': obs['country'],
            'accesses': obs['accesses']
        })
    return ranking

# ------------------------------------------------------------
# Manejador HTTP
# ------------------------------------------------------------
class ZeroFlenHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # API endpoints
        if path == '/api/observers/ranking':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            ranking = get_ranking()
            response = {
                'observers': ranking,
                'total_active': len(ranking)
            }
            self.wfile.write(json.dumps(response).encode())
            return

        # Servir archivos estáticos
        if path == '/':
            path = '/index.html'
        try:
            with open('.' + path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            if path.endswith('.html'):
                self.send_header('Content-Type', 'text/html; charset=utf-8')
            elif path.endswith('.css'):
                self.send_header('Content-Type', 'text/css')
            elif path.endswith('.js'):
                self.send_header('Content-Type', 'application/javascript')
            elif path.endswith('.json'):
                self.send_header('Content-Type', 'application/json')
            else:
                self.send_header('Content-Type', 'application/octet-stream')
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'404 Not Found')

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode()) if post_data else {}

        if path == '/api/observer/validate':
            try:
                name = data.get('name', '')
                exists = find_observer(name) is not None
                response_data = {
                    'available': not exists,
                    'message': 'Nombre disponible' if not exists else 'Nombre ya existe'
                }
                response_bytes = json.dumps(response_data).encode('utf-8')
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(response_bytes)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()  # <-- ESTA LÍNEA ES CRÍTICA
                
                self.wfile.write(response_bytes)
            except Exception as e:
                print(f"ERROR en validate: {e}")
                error_bytes = b'{"error":"internal error"}'
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(error_bytes)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(error_bytes)
            return

        elif path == '/api/observer/register':
            name = data.get('name')
            color = data.get('color')
            country = data.get('country')
            if not name or not color or not country:
                error_bytes = b'{"error":"Faltan datos"}'
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(error_bytes)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(error_bytes)
                return
            success = add_observer(name, color, country)
            if success:
                response_data = {'success': True, 'message': 'Registrado'}
            else:
                response_data = {'success': False, 'message': 'Nombre ya existe'}
            response_bytes = json.dumps(response_data).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(response_bytes)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(response_bytes)
            return

        elif path == '/api/observer/checkin':
            name = data.get('name')
            if not name:
                error_bytes = b'{"error":"Falta nombre"}'
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(error_bytes)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(error_bytes)
                return
            accesses = increment_access(name)
            if accesses is not None:
                ranking = get_ranking()
                rank = next((r['rank'] for r in ranking if r['name'] == name), None)
                response_data = {
                    'success': True,
                    'accesses': accesses,
                    'rank': rank
                }
            else:
                response_data = {'success': False, 'message': 'Observador no encontrado'}
            response_bytes = json.dumps(response_data).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(response_bytes)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(response_bytes)
            return

        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(b'{"error":"Not found"}')))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"error":"Not found"}')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

# ------------------------------------------------------------
# Iniciar servidor
# ------------------------------------------------------------
def run_server():
    # Generar data.json inicial
    save_data()

    handler = ZeroFlenHandler
    with socketserver.TCPServer((HOST, PORT), handler) as httpd:
        print(f"🚀 Servidor ZeroFlen v0.2 corriendo en http://{HOST}:{PORT}")
        print("Presiona Ctrl+C para detener")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Servidor detenido")
            httpd.shutdown()

if __name__ == '__main__':
    run_server()