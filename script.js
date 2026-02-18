/**
 * ZeroFlen v0.2 - Versión para hosting estático (sin backend)
 * Todo funciona con localStorage.
 */

(function() {
    // --------------------------------------------------------
    // Configuración
    // --------------------------------------------------------
    const FALLBACK_DATA = {
        version: '0.2-nucleus',
        days_elapsed: 1,
        financials: { initial: 20.00, invested: 9.29, remaining: 10.71, status: 'PROTECTED' },
        logs: [
            { timestamp: '2026-02-16 10:00', id: '001', msg: 'Dominio registrado en Namecheap ($6.79)' },
            { timestamp: '2026-02-16 10:05', id: '002', msg: 'Infraestructura v0.1 configurada ($2.50)' },
            { timestamp: '2026-02-16 10:10', id: '003', msg: 'Núcleo Desacoplado implementado' }
        ],
        evolution_state: 'Núcleo estable v0.2 - Gatekeeper activo'
    };

    // --------------------------------------------------------
    // Utilidades DOM (igual que antes)
    // --------------------------------------------------------
    const DOM = {
        countdown: document.getElementById('countdown-value'),
        budget: document.getElementById('budget-value'),
        invested: document.getElementById('invested-value'),
        statusBadge: document.getElementById('status-badge'),
        evolution: document.getElementById('evolution-text'),
        logContainer: document.getElementById('log-container'),
        versionBadge: document.getElementById('version-badge'),
        timestampBadge: document.getElementById('timestamp-badge'),

        gatekeeperModal: document.getElementById('gatekeeper-modal'),
        nameInput: document.getElementById('observer-name'),
        nameStatus: document.getElementById('name-status'),
        colorPalette: document.getElementById('color-palette'),
        colorName: document.getElementById('color-name'),
        previewName: document.getElementById('preview-name'),
        btnEnter: document.getElementById('btn-enter'),

        rankingList: document.getElementById('ranking-list'),
        observerCount: document.getElementById('observer-count'),
        rankingCurrent: document.getElementById('ranking-current'),

        btnToggleRanking: document.getElementById('btn-toggle-ranking'),
        rankingSidebar: document.getElementById('ranking-sidebar')
    };

    // --------------------------------------------------------
    // "Base de datos" simulada en localStorage
    // --------------------------------------------------------
    function getObserversDB() {
        const stored = localStorage.getItem('observers_db');
        if (stored) {
            return JSON.parse(stored);
        } else {
            // Datos de ejemplo para que no esté vacío
            const defaultDB = [
                { name: 'AlphaVortex42', color: '#39FF14', country: '🇺🇸', accesses: 5 },
                { name: 'SilverNeon', color: '#00FFFF', country: '🇩🇪', accesses: 3 }
            ];
            localStorage.setItem('observers_db', JSON.stringify(defaultDB));
            return defaultDB;
        }
    }

    function saveObserversDB(db) {
        localStorage.setItem('observers_db', JSON.stringify(db));
    }

    function findObserver(name) {
        const db = getObserversDB();
        return db.find(obs => obs.name === name);
    }

    function addObserver(name, color, country) {
        const db = getObserversDB();
        if (db.find(obs => obs.name === name)) return false;
        db.push({
            name: name,
            color: color,
            country: country,
            accesses: 1
        });
        saveObserversDB(db);
        return true;
    }

    function incrementAccess(name) {
        const db = getObserversDB();
        const obs = db.find(o => o.name === name);
        if (obs) {
            obs.accesses += 1;
            saveObserversDB(db);
            return obs.accesses;
        }
        return null;
    }

    function getRanking() {
        const db = getObserversDB();
        const sorted = [...db].sort((a, b) => b.accesses - a.accesses);
        return sorted.map((obs, index) => ({
            rank: index + 1,
            name: obs.name,
            color: obs.color,
            country: obs.country,
            accesses: obs.accesses
        }));
    }

    // --------------------------------------------------------
    // NameValidator (sin fetch)
    // --------------------------------------------------------
    class NameValidator {
        constructor() {
            this.minLength = 3;
            this.maxLength = 20;
            this.pattern = /^[a-zA-Z0-9_-]{3,20}$/;
            this.debounceTimer = null;
        }

        validar_formato(nombre) {
            if (!nombre || nombre.length < this.minLength) return { valid: false, msg: 'Mínimo 3 caracteres' };
            if (!this.pattern.test(nombre)) return { valid: false, msg: 'Solo letras, números, guiones y guiones bajos' };
            return { valid: true, msg: '' };
        }

        validar_unicidad(nombre) {
            const exists = findObserver(nombre) !== undefined;
            return {
                valid: !exists,
                msg: exists ? '❌ Nombre ya existe' : '✅ Nombre disponible'
            };
        }

        validar_con_debounce(nombre) {
            clearTimeout(this.debounceTimer);
            const formatoOk = this.validar_formato(nombre);
            if (!formatoOk.valid) return Promise.resolve(formatoOk);
            return new Promise(resolve => {
                this.debounceTimer = setTimeout(() => {
                    resolve(this.validar_unicidad(nombre));
                }, 500);
            });
        }
    }

    // --------------------------------------------------------
    // ColorSelector (genera los botones)
    // --------------------------------------------------------
    class ColorSelector {
        constructor() {
            this.colors = [
                { hex: '#39FF14', name: 'Verde' },
                { hex: '#00FFFF', name: 'Cian' },
                { hex: '#FF00FF', name: 'Magenta' },
                { hex: '#FFFF00', name: 'Amarillo' },
                { hex: '#FF6600', name: 'Naranja' },
                { hex: '#FFFFFF', name: 'Blanco' },
                { hex: '#0099FF', name: 'Azul' }
            ];
            this.selected = null;
            this.renderPalette();
        }

        renderPalette() {
            DOM.colorPalette.innerHTML = '';
            this.colors.forEach(c => {
                const btn = document.createElement('button');
                btn.className = 'color-btn';
                btn.dataset.color = c.hex;
                btn.dataset.name = c.name;
                btn.innerHTML = `
                    <span class="color-circle" style="background: ${c.hex}; box-shadow: 0 0 10px ${c.hex};"></span>
                    <span class="color-label">${c.name}</span>
                `;
                btn.addEventListener('click', () => this.seleccionar_color(c.hex, c.name));
                DOM.colorPalette.appendChild(btn);
            });
        }

        seleccionar_color(hex, name) {
            document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('selected'));
            const selectedBtn = document.querySelector(`.color-btn[data-color="${hex}"]`);
            if (selectedBtn) selectedBtn.classList.add('selected');
            this.selected = { hex, name };
            DOM.colorName.innerHTML = `Color seleccionado: <strong style="color: ${hex};">${name}</strong>`;
            this.actualizar_preview(hex);
            validar_completitud();
        }

        actualizar_preview(hex) {
            DOM.previewName.style.color = hex;
        }
    }

    // --------------------------------------------------------
    // Funciones del Gatekeeper
    // --------------------------------------------------------
    function validar_completitud() {
        const nombre = DOM.nameInput.value.trim();
        const colorOk = colorSelector && colorSelector.selected !== null;
        const nombreOk = nombre.length >= 3 && /^[a-zA-Z0-9_-]{3,20}$/.test(nombre);
        if (nombreOk && colorOk) {
            DOM.btnEnter.disabled = false;
            DOM.btnEnter.classList.add('enabled');
        } else {
            DOM.btnEnter.disabled = true;
            DOM.btnEnter.classList.remove('enabled');
        }
    }

    async function acceder() {
        const nombre = DOM.nameInput.value.trim();
        const color = colorSelector.selected.hex;

        let country = '🏳️';
        try {
            const ipRes = await fetch('https://ipapi.co/json/');
            const ipData = await ipRes.json();
            const code = ipData.country_code;
            if (code) {
                country = code.toUpperCase().replace(/./g, char => 
                    String.fromCodePoint(127397 + char.charCodeAt())
                );
            }
        } catch (e) {
            console.warn('Geolocalización falló');
        }

        DOM.btnEnter.classList.add('loading');
        DOM.btnEnter.innerHTML = '<span class="spinner-small"></span> ACCEDIENDO...';

        const success = addObserver(nombre, color, country);
        if (success) {
            const observer = { name: nombre, color: color, country: country };
            localStorage.setItem('observer', JSON.stringify(observer));
            currentObserver = observer;
            cerrarGatekeeper();

            rankingManager.cargar_ranking();
            rankingManager.registrar_acceso(); // incrementa a 2? (ya se puso 1 en addObserver)
        } else {
            alert('Error: el nombre ya existe');
        }

        DOM.btnEnter.classList.remove('loading');
        DOM.btnEnter.innerHTML = '🚀 ACCEDER AL LOBBY';
    }

    function cerrarGatekeeper() {
        DOM.gatekeeperModal.classList.remove('active');
    }

    function abrirGatekeeper() {
        DOM.gatekeeperModal.classList.add('active');
    }

    // --------------------------------------------------------
    // RankingManager (simulado con localStorage)
    // --------------------------------------------------------
    class RankingManager {
        constructor() {
            this.observers = [];
            this.updateInterval = null;
        }

        cargar_ranking() {
            this.observers = getRanking();
            this.render_ranking();
            if (currentObserver) {
                this.actualizar_observador_actual();
            }
        }

        render_ranking() {
            DOM.rankingList.innerHTML = '';
            this.observers.forEach(obs => {
                const entry = document.createElement('div');
                entry.className = 'ranking-entry';
                entry.innerHTML = `
                    <div class="entry-left">
                        <span class="rank">${obs.rank}</span>
                        <span class="observer-name" style="color: ${obs.color};">${obs.name}</span>
                    </div>
                    <div class="entry-right">
                        <span class="country">${obs.country}</span>
                        <span class="accesses">${obs.accesses.toLocaleString()}</span>
                    </div>
                `;
                DOM.rankingList.appendChild(entry);
            });
            DOM.observerCount.textContent = `#${this.observers.length} activos`;
        }

        actualizar_observador_actual() {
            const obs = this.observers.find(o => o.name === currentObserver.name);
            if (obs) {
                currentObserver.accesses = obs.accesses;
                currentObserver.rank = obs.rank;
                const html = `
                    <p class="current-label">TÚ ERES:</p>
                    <p class="current-name breathe" style="color: ${currentObserver.color};">${currentObserver.name}</p>
                    <div class="current-details">
                        <span class="current-country">${currentObserver.country}</span>
                        <p class="current-rank">Rango: #${obs.rank}</p>
                        <p class="current-accesses">Accesos: ${obs.accesses.toLocaleString()}</p>
                    </div>
                `;
                DOM.rankingCurrent.innerHTML = html;
            }
        }

        registrar_acceso() {
            if (!currentObserver) return;
            const accesses = incrementAccess(currentObserver.name);
            if (accesses) {
                currentObserver.accesses = accesses;
                this.cargar_ranking();
            }
        }

        start_auto_update() {
            if (this.updateInterval) clearInterval(this.updateInterval);
            this.updateInterval = setInterval(() => this.cargar_ranking(), 5000);
        }

        stop_auto_update() {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
        }
    }

    // --------------------------------------------------------
    // Funciones del lobby (carga data.json)
    // --------------------------------------------------------
    async function loadLobbyData() {
        try {
            const response = await fetch(`data.json?t=${Date.now()}`);
            const data = await response.json();
            renderLobby(data);
        } catch (error) {
            renderLobby(FALLBACK_DATA);
        }
    }

    function renderLobby(data) {
        if (DOM.versionBadge) DOM.versionBadge.textContent = data.version;
        if (DOM.budget) DOM.budget.textContent = '$' + data.financials.remaining.toFixed(2);
        if (DOM.invested) DOM.invested.textContent = '$' + data.financials.invested.toFixed(2);
        if (DOM.statusBadge) DOM.statusBadge.textContent = data.financials.status;
        if (DOM.evolution) DOM.evolution.textContent = data.evolution_state;
        if (DOM.logContainer) {
            DOM.logContainer.innerHTML = '';
            if (data.logs && data.logs.length) {
                data.logs.forEach(log => {
                    const entry = document.createElement('div');
                    entry.className = 'log-entry';
                    entry.innerHTML = `
                        <span class="log-timestamp">${log.timestamp}</span>
                        <span class="log-id">${log.id}</span>
                        <span class="log-msg">${log.msg}</span>
                    `;
                    DOM.logContainer.appendChild(entry);
                });
            } else {
                DOM.logContainer.innerHTML = '<div class="logs-empty">Sin eventos registrados</div>';
            }
        }
    }

    // Contador regresivo
    const EXPIRATION_DATE = new Date(2027, 1, 16);
    function updateCountdown() {
        const now = new Date();
        const diff = EXPIRATION_DATE - now;
        if (diff <= 0) {
            DOM.countdown.textContent = '0d 00h 00m 00s';
            return;
        }
        const seconds = Math.floor(diff / 1000) % 60;
        const minutes = Math.floor(diff / (1000 * 60)) % 60;
        const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        DOM.countdown.textContent = `${days}d ${hours.toString().padStart(2,'0')}h ${minutes.toString().padStart(2,'0')}m ${seconds.toString().padStart(2,'0')}s`;
    }

    function updateTimestampBadge() {
        const now = new Date();
        DOM.timestampBadge.textContent = now.toTimeString().slice(0,8);
    }

    // --------------------------------------------------------
    // Inicialización
    // --------------------------------------------------------
    let currentObserver = null;
    let colorSelector = null;
    let rankingManager = null;
    let nameValidator = null;

    async function init() {
        window.zeroFlenUI = {
            recargar_datos: loadLobbyData,
            mostrar_status: () => {
                const days = DOM.countdown.textContent;
                const budget = DOM.budget.textContent;
                alert(`ZeroFlen v0.2\nTiempo restante: ${days}\nSaldo: ${budget}`);
            }
        };

        updateCountdown();
        setInterval(updateCountdown, 1000);
        setInterval(updateTimestampBadge, 1000);

        await loadLobbyData();

        rankingManager = new RankingManager();

        const stored = localStorage.getItem('observer');
        if (stored) {
            currentObserver = JSON.parse(stored);
            DOM.gatekeeperModal.classList.remove('active');
            rankingManager.cargar_ranking();
            rankingManager.start_auto_update();
            rankingManager.registrar_acceso();
        } else {
            abrirGatekeeper();
            nameValidator = new NameValidator();
            colorSelector = new ColorSelector();

            DOM.nameInput.addEventListener('input', async (e) => {
                const nombre = e.target.value.trim();
                DOM.previewName.textContent = nombre || 'Ingresa tu nombre';
                const resultado = await nameValidator.validar_con_debounce(nombre);
                DOM.nameStatus.textContent = resultado.msg;
                DOM.nameStatus.className = 'name-status ' + (resultado.valid ? 'valid' : 'invalid');
                validar_completitud();
            });

            DOM.btnEnter.addEventListener('click', acceder);
        }

        if (DOM.btnToggleRanking) {
            DOM.btnToggleRanking.addEventListener('click', () => {
                DOM.rankingSidebar.classList.toggle('visible');
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
