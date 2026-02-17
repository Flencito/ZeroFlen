#!/usr/bin/env python3
"""
ZeroFlen v0.1 - Generador de estado
Genera data.json con la información financiera, logs y evolución.
Sin dependencias externas.
"""

import json
from datetime import date, timedelta

# ------------------------------------------------------------
# TimeKeeper: cálculo de días transcurridos
# ------------------------------------------------------------
class TimeKeeper:
    START_DATE = date(2026, 2, 16)

    @classmethod
    def get_days_elapsed(cls) -> int:
        """Retorna días transcurridos desde START_DATE (día 1 = START_DATE)."""
        today = date.today()
        delta = today - cls.START_DATE
        # Si hoy es 16/2/2026 → delta.days = 0, queremos día 1
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
        """Crea las 3 entradas de log requeridas."""
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
# Construcción del objeto final
# ------------------------------------------------------------
def build_data():
    days = TimeKeeper.get_days_elapsed()
    financials = FinanceManager.get_financials()
    logs = LogSystem.generate_logs()

    data = {
        "version": "0.1-nucleus",
        "days_elapsed": days,
        "financials": financials,
        "logs": logs,
        "evolution_state": "Núcleo estable v0.1 - Todos los sistemas en línea",
    }
    return data

# ------------------------------------------------------------
# Escritura del archivo data.json
# ------------------------------------------------------------
if __name__ == "__main__":
    data = build_data()
    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("✅ data.json generado correctamente.")