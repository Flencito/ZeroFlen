/**
 * ZeroFlen v0.9 - Módulo principal (Lobby, ranking, reproductor, comunidad)
 * Depende de: database.js, centinel.js, auth.js
 */

(function() {
    // --------------------------------------------------------
    // Datos de respaldo para el lobby
    // --------------------------------------------------------
    const FALLBACK_DATA = {
        version: '0.9-centinela',
        days_elapsed: 1,
        financials: { initial: 20.00, invested: 9.29, remaining: 10.71, status: 'PROTECTED' },
        logs: [
            { timestamp: '2026-02-16 10:00', id: '001', msg: 'Dominio registrado en Namecheap ($6.79)' },
            { timestamp: '2026-02-16 10:05', id: '002', msg: 'Infraestructura v0.1 configurada ($2.50)' },
            { timestamp: '2026-02-16 10:10', id: '003', msg: 'Núcleo Desacoplado implementado' },
            { timestamp: '2026-02-20 09:00', id: '004', msg: 'Protocolo Centinela activado' }
        ],
        evolution_state: 'Núcleo estable v0.9 - Seguridad total'
    };

    // --------------------------------------------------------
    // Utilidades DOM
    // --------------------------------------------------------
    const DOM = {
        // Lobby
        countdown: document.getElementById('countdown-value'),
        budget: document.getElementById('budget-value'),
        invested: document.getElementById('invested-value'),
        statusBadge: document.getElementById('status-badge'),
        evolution: document.getElementById('evolution-text'),
        logContainer: document.getElementById('log-container'),
        versionBadge: document.getElementById('version-badge'),
        timestampBadge: document.getElementById('timestamp-badge'),

        // Gatekeeper
        gatekeeperModal: document.getElementById('gatekeeper-modal'),
        nameInput: document.getElementById('observer-name'),
        nameStatus: document.getElementById('name-status'),
        colorName: document.getElementById('color-name'),
        previewName: document.getElementById('preview-name'),
        btnEnter: document.getElementById('btn-enter'),
        showCountryToggle: document.getElementById('show-country-toggle'),
        registerForm: document.getElementById('register-form'),
        loginForm: document.getElementById('login-form'),
        btnShowLogin: document.getElementById('btn-show-login'),
        btnShowRegister: document.getElementById('btn-show-register'),
        btnLogin: document.getElementById('btn-login'),
        accessKeyInput: document.getElementById('access-key-input'),

        // Ranking
        rankingList: document.getElementById('ranking-list'),
        observerCount: document.getElementById('observer-count'),
        rankingCurrent: document.getElementById('ranking-current'),
        btnToggleRanking: document.getElementById('btn-toggle-ranking'),
        rankingSidebar: document.getElementById('ranking-sidebar'),

        // Menú
        menuProfileName: document.getElementById('profile-name'),
        menuColorDot: document.getElementById('profile-color-dot'),
        btnGaleria: document.getElementById('btn-galeria'),
        btnComunidad: document.getElementById('btn-comunidad'),
        btnIdentidad: document.getElementById('btn-identidad'),
        btnTemas: document.getElementById('btn-temas'),
        menuSidebar: document.querySelector('.menu-sidebar'),

        // Botones móvil
        btnToggleRankingMobile: document.getElementById('btn-toggle-ranking-mobile'),
        btnToggleMenuMobile: document.getElementById('btn-toggle-menu-mobile'),

        // Mini reproductor
        miniPlayerContainer: document.getElementById('mini-player-container'),
        miniPlayerCover: document.getElementById('mini-player-cover'),
        miniPlayerTitle: document.getElementById('mini-player-title'),
        miniPlayPause: document.getElementById('mini-play-pause'),
        miniPrev: document.getElementById('mini-prev'),
        miniNext: document.getElementById('mini-next'),
        miniClose: document.getElementById('mini-close'),
        musicToggleBtn: document.getElementById('music-toggle-btn'),
        musicToggleIcon: document.getElementById('music-toggle-icon'),
        miniProgressContainer: document.getElementById('mini-progress-container'),
        miniProgressBar: document.getElementById('mini-progress-bar'),
        miniProgressTooltip: document.getElementById('mini-progress-tooltip'),

        // Modales (AÑADIDOS)
        galeriaModal: document.getElementById('galeria-modal'),
        comunidadModal: document.getElementById('comunidad-modal'),
        identidadModal: document.getElementById('identidad-modal'),
        temasModal: document.getElementById('temas-modal'),
        galeriaGrid: document.getElementById('galeria-grid'),
        comunidadMensajes: document.getElementById('comunidad-mensajes'),
        comunidadInput: document.getElementById('comunidad-input'),
        btnTransmitir: document.getElementById('btn-transmitir'),
        identidadDatos: document.getElementById('identidad-datos'),
        identidadShowCountry: document.getElementById('identidad-show-country'),
        identidadClaveValor: document.getElementById('identidad-clave-valor'),
        btnCopiarClave: document.getElementById('btn-copiar-clave'),
        temasGrid: document.getElementById('temas-grid'),
        btnTemasGuardar: document.getElementById('btn-temas-guardar')
    };

    // --------------------------------------------------------
    // Estado global (expuesto para otros módulos)
    // --------------------------------------------------------
    window.currentObserver = null;
    window.DOM = DOM;

    // --------------------------------------------------------
    // Funciones auxiliares del Gatekeeper
    // --------------------------------------------------------
    window.cerrarGatekeeper = function() {
        DOM.gatekeeperModal.classList.remove('active');
    };

    window.abrirGatekeeper = function() {
        DOM.gatekeeperModal.classList.add('active');
    };

    // --------------------------------------------------------
    // Reproductor global (sin cambios)
    // --------------------------------------------------------
    const MusicPlayer = (function() {
        let playlist = [];
        let currentIndex = 0;
        let isPlaying = false;
        let progressInterval = null;
        let youtubePlayer = null;
        let onStateChangeCallbacks = [];

        function loadYouTubeAPI() {
            if (window.YT && window.YT.Player) return Promise.resolve();
            return new Promise(resolve => {
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                window.onYouTubeIframeAPIReady = resolve;
            });
        }

        async function createPlayer(videoId) {
            await loadYouTubeAPI();
            if (youtubePlayer) youtubePlayer.loadVideoById(videoId);
            else {
                youtubePlayer = new YT.Player('youtube-player-hidden', {
                    height: '0', width: '0', videoId,
                    playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1 },
                    events: {
                        onReady: () => { startProgressInterval(); isPlaying = true; triggerStateChange(); },
                        onStateChange: (e) => {
                            if (e.data === YT.PlayerState.PLAYING) isPlaying = true;
                            else if (e.data === YT.PlayerState.PAUSED) isPlaying = false;
                            else if (e.data === YT.PlayerState.ENDED) next();
                            triggerStateChange();
                        }
                    }
                });
            }
        }

        function startProgressInterval() {
            if (progressInterval) clearInterval(progressInterval);
            progressInterval = setInterval(() => { if (youtubePlayer && isPlaying) triggerStateChange(); }, 100);
        }

        function triggerStateChange() { onStateChangeCallbacks.forEach(cb => cb(getState())); }

        function getState() {
            if (!youtubePlayer) return { current: null, isPlaying: false, currentTime: 0, duration: 0 };
            const currentSong = playlist[currentIndex] || null;
            return { current: currentSong, isPlaying, currentTime: youtubePlayer.getCurrentTime() || 0, duration: youtubePlayer.getDuration() || 0 };
        }

        return {
            setPlaylist(songs) { playlist = songs; },
            playSong(song) {
                const index = playlist.findIndex(s => s.id === song.id);
                if (index !== -1) currentIndex = index;
                createPlayer(song.youtubeId);
            },
            play() { if (youtubePlayer) { youtubePlayer.playVideo(); isPlaying = true; triggerStateChange(); } },
            pause() { if (youtubePlayer) { youtubePlayer.pauseVideo(); isPlaying = false; triggerStateChange(); } },
            togglePlayPause() { if (isPlaying) this.pause(); else this.play(); },
            seekTo(seconds) { if (youtubePlayer) { youtubePlayer.seekTo(seconds, true); triggerStateChange(); } },
            next() {
                if (playlist.length === 0) return;
                currentIndex = (currentIndex + 1) % playlist.length;
                createPlayer(playlist[currentIndex].youtubeId);
            },
            prev() {
                if (playlist.length === 0) return;
                currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
                createPlayer(playlist[currentIndex].youtubeId);
            },
            onStateChange(callback) { onStateChangeCallbacks.push(callback); return () => { onStateChangeCallbacks = onStateChangeCallbacks.filter(cb => cb !== callback); }; },
            getState
        };
    })();

    // --------------------------------------------------------
    // MiniPlayerLobby (sin cambios)
    // --------------------------------------------------------
    class MiniPlayerLobby {
        // ... (todo el código original, sin cambios) ...
        // Por brevedad no lo repito aquí, pero debe mantenerse intacto.
    }

    // --------------------------------------------------------
    // NameValidator (sin cambios)
    // --------------------------------------------------------
    class NameValidator {
        // ... (código original) ...
    }

    // --------------------------------------------------------
    // ColorSelector (sin cambios)
    // --------------------------------------------------------
    class ColorSelector {
        // ... (código original) ...
    }

    // --------------------------------------------------------
    // Funciones del Gatekeeper (sin cambios)
    // --------------------------------------------------------
    function validar_completitud() { /* ... */ }
    async function acceder() { /* ... */ }

    // --------------------------------------------------------
    // RankingManager (sin cambios)
    // --------------------------------------------------------
    class RankingManager {
        // ... (código original) ...
    }

    // ============================================================
    // NUEVAS CLASES DE MODALES (AÑADIDAS)
    // ============================================================

    // --------------------------------------------------------
    // Galería Modal (AÑADIDO)
    // --------------------------------------------------------
    class GaleriaModal {
        constructor() {
            this.modal = DOM.galeriaModal;
            this.grid = DOM.galeriaGrid;
            this.proyectos = [
                { id: 1, name: 'Brighter', category: 'Hazbin Hotel', youtubeId: 'eTpEdZoAYbM', cover: 'https://img.youtube.com/vi/eTpEdZoAYbM/0.jpg' },
                { id: 2, name: 'Jester', category: 'The Amazing Digital Circus', youtubeId: 'FxOFYp_ZA8M', cover: 'https://img.youtube.com/vi/FxOFYp_ZA8M/0.jpg' },
                { id: 3, name: 'I Cant Control Myself', category: 'Fnaf', youtubeId: 'YgiopHEUcqI', cover: 'https://img.youtube.com/vi/YgiopHEUcqI/0.jpg' }
            ];
            this.currentPlaylist = this.proyectos.filter(p => p.youtubeId);
            this.unsubscribe = MusicPlayer.onStateChange(state => this.syncWithPlayer(state));
            this.initCloseButtons();
        }

        initCloseButtons() {
            const closeBtn = this.modal.querySelector('.btn-close-galeria');
            const volverBtn = this.modal.querySelector('.btn-volver-galeria');
            if (closeBtn) closeBtn.addEventListener('click', () => this.cerrar());
            if (volverBtn) volverBtn.addEventListener('click', () => this.cerrar());
        }

        abrir() {
            this.modal.classList.add('visible');
            this.renderGrid();
        }

        cerrar() {
            this.modal.classList.remove('visible');
        }

        renderGrid() {
            this.grid.innerHTML = '';
            this.proyectos.forEach(proj => {
                const card = document.createElement('div');
                card.className = 'gallery-card';
                card.innerHTML = `
                    <div class="card-image-wrapper">
                        <img class="card-image" src="${proj.cover}" alt="${proj.name}">
                        <div class="card-overlay">
                            <button class="decode-btn" data-id="${proj.id}">🎵 REPRODUCIR</button>
                        </div>
                        <div class="card-info">
                            <div class="card-title">${proj.name}</div>
                            <div class="card-subtitle">${proj.category}</div>
                        </div>
                    </div>
                `;
                const playBtn = card.querySelector('.decode-btn');
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.reproducir(proj);
                });
                this.grid.appendChild(card);
            });
        }

        reproducir(proj) {
            MusicPlayer.setPlaylist(this.currentPlaylist);
            MusicPlayer.playSong(proj);
            this.cerrar();
        }

        syncWithPlayer(state) {
            // Opcional: sincronizar con el reproductor
        }
    }

    // --------------------------------------------------------
    // IdentidadModal (AÑADIDO)
    // --------------------------------------------------------
    class IdentidadModal {
        constructor() {
            this.modal = DOM.identidadModal;
            this.datosContainer = DOM.identidadDatos;
            this.toggle = DOM.identidadShowCountry;
            this.claveValor = DOM.identidadClaveValor;
            this.btnCopiar = DOM.btnCopiarClave;
            this.initCloseButtons();
            this.initEvents();
        }

        initCloseButtons() {
            const closeBtn = this.modal.querySelector('.btn-close-identidad');
            const volverBtn = this.modal.querySelector('.btn-volver-identidad');
            if (closeBtn) closeBtn.addEventListener('click', () => this.cerrar());
            if (volverBtn) volverBtn.addEventListener('click', () => this.cerrar());
        }

        initEvents() {
            this.toggle.addEventListener('change', async () => {
                if (window.currentObserver) {
                    await window.db.updateObserver(window.currentObserver.id, { show_country: this.toggle.checked });
                    window.currentObserver.show_country = this.toggle.checked;
                    window.rankingManager.cargar_ranking();
                }
            });
            this.btnCopiar.addEventListener('click', () => {
                if (this.claveValor.textContent) {
                    navigator.clipboard.writeText(this.claveValor.textContent);
                    alert('Clave copiada al portapapeles');
                }
            });
        }

        abrir() {
            if (!window.currentObserver) {
                alert('No hay observador logueado');
                return;
            }
            this.modal.classList.add('visible');
            this.renderDatos();
        }

        cerrar() {
            this.modal.classList.remove('visible');
        }

        renderDatos() {
            const obs = window.currentObserver;
            this.datosContainer.innerHTML = `
                <p><strong>Nombre:</strong> ${obs.name}</p>
                <p><strong>Color:</strong> <span style="color: ${obs.color};">${obs.color}</span></p>
                <p><strong>País:</strong> ${obs.country}</p>
                <p><strong>Accesos:</strong> ${obs.accesses}</p>
            `;
            this.toggle.checked = obs.show_country;
            this.claveValor.textContent = obs.access_key;
        }
    }

    // --------------------------------------------------------
    // TemasModal (sin cambios, pero aseguramos que tenga cerrar)
    // --------------------------------------------------------
    class TemasModal {
        constructor() {
            this.modal = DOM.temasModal;
            this.grid = DOM.temasGrid;
            this.btnGuardar = DOM.btnTemasGuardar;
            this.temas = [
                { id: 'default', nombre: 'Neón', color: '#39FF14' },
                { id: 'synthwave', nombre: 'Synthwave', color: '#ff00ff' },
                { id: 'deepsea', nombre: 'Deep Sea', color: '#00d4ff' },
                { id: 'amber', nombre: 'Ámbar', color: '#ffb000' },
                { id: 'monochrome', nombre: 'Monocromo', color: '#ffffff' }
            ];
            this.selectedTheme = localStorage.getItem('zeroflen-theme') || 'default';
            this.initCloseButtons();
            this.initEvents();
        }

        initCloseButtons() {
            const closeBtn = this.modal.querySelector('.btn-close-temas');
            if (closeBtn) closeBtn.addEventListener('click', () => this.cerrar());
        }

        initEvents() {
            this.btnGuardar.addEventListener('click', () => this.guardar());
        }

        abrir() {
            this.modal.classList.add('visible');
            this.renderGrid();
        }

        cerrar() {
            this.modal.classList.remove('visible');
        }

        renderGrid() {
            this.grid.innerHTML = '';
            this.temas.forEach(tema => {
                const opcion = document.createElement('div');
                opcion.className = 'tema-opcion';
                if (tema.id === this.selectedTheme) opcion.classList.add('selected');
                opcion.dataset.tema = tema.id;
                opcion.innerHTML = `
                    <div class="tema-color" style="background: ${tema.color};"></div>
                    <div class="tema-nombre">${tema.nombre}</div>
                    <div class="tema-preview">Vista previa</div>
                `;
                opcion.addEventListener('click', () => {
                    document.querySelectorAll('.tema-opcion').forEach(opt => opt.classList.remove('selected'));
                    opcion.classList.add('selected');
                    this.selectedTheme = tema.id;
                });
                this.grid.appendChild(opcion);
            });
        }

        guardar() {
            aplicarTema(this.selectedTheme);
            localStorage.setItem('zeroflen-theme', this.selectedTheme);
            this.cerrar();
        }
    }

    function aplicarTema(themeId) {
        document.documentElement.setAttribute('data-theme', themeId);
    }

    // --------------------------------------------------------
    // Menú Sidebar (MODIFICADO: se añaden los nuevos modales)
    // --------------------------------------------------------
    class MenuSidebar {
        constructor(observer) {
            this.observer = observer;
            this.actualizarPerfil();
            DOM.btnGaleria.addEventListener('click', () => galeriaModal.abrir());
            DOM.btnComunidad.addEventListener('click', () => comunidadModal.abrir());
            DOM.btnIdentidad.addEventListener('click', () => identidadModal.abrir());
            DOM.btnTemas.addEventListener('click', () => temasModal.abrir());
        }
        actualizarPerfil() {
            if (this.observer) {
                DOM.menuProfileName.textContent = this.observer.name;
                DOM.menuColorDot.style.color = this.observer.color;
                DOM.menuColorDot.style.backgroundColor = this.observer.color;
            } else {
                DOM.menuProfileName.textContent = 'Invitado';
                DOM.menuColorDot.style.backgroundColor = '#39FF14';
            }
        }
    }

    function formatTime(seconds) {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // --------------------------------------------------------
    // Funciones del lobby
    // --------------------------------------------------------
    async function loadLobbyData() {
        try {
            const response = await fetch(`data.json?t=${Date.now()}`);
            const data = await response.json();
            renderLobby(data);
        } catch (error) {
            console.warn('Error cargando data.json, usando fallback:', error);
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

    const EXPIRATION_DATE = new Date(2027, 1, 16);
    function updateCountdown() {
        const now = new Date();
        const diff = EXPIRATION_DATE - now;
        if (diff <= 0) { DOM.countdown.textContent = '0d 00h 00m 00s'; return; }
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
    // Inicialización (MODIFICADA: se añaden las instancias de los nuevos modales)
    // --------------------------------------------------------
    let nameValidator, colorSelector, rankingManager, miniPlayerLobby, menuSidebar;
    let galeriaModal, comunidadModal, identidadModal, temasModal; // AÑADIDO

    async function init() {
        window.zeroFlenUI = {
            recargar_datos: loadLobbyData,
            mostrar_status: () => {
                const days = DOM.countdown.textContent;
                const budget = DOM.budget.textContent;
                alert(`ZeroFlen v0.9\nTiempo restante: ${days}\nSaldo: ${budget}`);
            }
        };

        updateCountdown();
        setInterval(updateCountdown, 1000);
        setInterval(updateTimestampBadge, 1000);

        await loadLobbyData();
        rankingManager = new RankingManager();
        window.rankingManager = rankingManager;

        // Configurar eventos del Gatekeeper
        if (DOM.btnShowLogin) {
            DOM.btnShowLogin.addEventListener('click', () => {
                DOM.registerForm.style.display = 'none';
                DOM.loginForm.style.display = 'block';
            });
        }
        if (DOM.btnShowRegister) {
            DOM.btnShowRegister.addEventListener('click', () => {
                DOM.loginForm.style.display = 'none';
                DOM.registerForm.style.display = 'block';
            });
        }
        if (DOM.btnLogin) {
            DOM.btnLogin.addEventListener('click', window.loginConClave || (() => {}));
        }
        if (DOM.accessKeyInput) {
            DOM.accessKeyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && window.loginConClave) window.loginConClave();
            });
        }

        const stored = localStorage.getItem('observer');
        if (stored) {
            try {
                window.currentObserver = JSON.parse(stored);
                if (window.currentObserver.id) {
                    const existe = await window.db.getObserverById(window.currentObserver.id);
                    if (!existe) {
                        localStorage.removeItem('observer');
                        window.currentObserver = null;
                        abrirGatekeeper();
                    } else {
                        DOM.gatekeeperModal.classList.remove('active');
                        await rankingManager.cargar_ranking();
                        rankingManager.start_auto_update();
                        await rankingManager.registrar_acceso();
                    }
                } else {
                    localStorage.removeItem('observer');
                    window.currentObserver = null;
                    abrirGatekeeper();
                }
            } catch (e) {
                localStorage.removeItem('observer');
                abrirGatekeeper();
            }
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

        menuSidebar = new MenuSidebar(window.currentObserver);

        if (DOM.miniPlayerContainer && DOM.musicToggleBtn) {
            miniPlayerLobby = new MiniPlayerLobby();
        }

        // Inicializar modales (AÑADIDO)
        galeriaModal = new GaleriaModal();
        comunidadModal = new ComunidadModal(); // Esta clase ya existía
        identidadModal = new IdentidadModal();
        temasModal = new TemasModal(); // Esta clase ya existía (con cerrar añadido)

        // Cerrar modales al hacer clic en el overlay (AÑADIDO)
        document.querySelectorAll('.galeria-modal .galeria-overlay, .comunidad-modal .comunidad-overlay, .identidad-modal .identidad-overlay, .temas-modal .temas-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    const modal = overlay.parentElement;
                    modal.classList.remove('visible');
                }
            });
        });

        if (DOM.btnToggleRankingMobile) {
            DOM.btnToggleRankingMobile.addEventListener('click', () => DOM.rankingSidebar.classList.toggle('visible'));
        }
        if (DOM.btnToggleMenuMobile) {
            DOM.btnToggleMenuMobile.addEventListener('click', () => document.querySelector('.menu-sidebar').classList.toggle('visible'));
        }
        if (DOM.btnToggleRanking) {
            DOM.btnToggleRanking.addEventListener('click', () => DOM.rankingSidebar.classList.toggle('visible'));
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    // Cargar tema guardado
    const savedTheme = localStorage.getItem('zeroflen-theme');
    if (savedTheme) aplicarTema(savedTheme);

    if (!document.getElementById('youtube-player-hidden')) {
        document.body.insertAdjacentHTML('beforeend', '<div id="youtube-player-hidden" style="display: none;"></div>');
    }
})();