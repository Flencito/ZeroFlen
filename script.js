/**
 * ZeroFlen v0.9 - Módulo principal (versión de emergencia)
 */
(function() {
    // --------------------------------------------------------
    // Datos de respaldo
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
        rankingList: document.getElementById('ranking-list'),
        observerCount: document.getElementById('observer-count'),
        rankingCurrent: document.getElementById('ranking-current'),
        btnToggleRanking: document.getElementById('btn-toggle-ranking'),
        rankingSidebar: document.getElementById('ranking-sidebar'),
        menuProfileName: document.getElementById('profile-name'),
        menuColorDot: document.getElementById('profile-color-dot'),
        btnGaleria: document.getElementById('btn-galeria'),
        btnComunidad: document.getElementById('btn-comunidad'),
        btnIdentidad: document.getElementById('btn-identidad'),
        btnTemas: document.getElementById('btn-temas'),
        menuSidebar: document.querySelector('.menu-sidebar'),
        btnToggleRankingMobile: document.getElementById('btn-toggle-ranking-mobile'),
        btnToggleMenuMobile: document.getElementById('btn-toggle-menu-mobile'),
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
        // Modales
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

    window.currentObserver = null;
    window.DOM = DOM;

    // --------------------------------------------------------
    // Funciones básicas
    // --------------------------------------------------------
    window.cerrarGatekeeper = () => DOM.gatekeeperModal?.classList.remove('active');
    window.abrirGatekeeper = () => DOM.gatekeeperModal?.classList.add('active');

    // --------------------------------------------------------
    // Reproductor de música (simplificado pero funcional)
    // --------------------------------------------------------
    const MusicPlayer = (function() {
        let playlist = [];
        let currentIndex = 0;
        let isPlaying = false;
        let youtubePlayer = null;
        let onStateChangeCallbacks = [];

        function loadYouTubeAPI() {
            return new Promise(resolve => {
                if (window.YT) { resolve(); return; }
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                document.head.appendChild(tag);
                window.onYouTubeIframeAPIReady = resolve;
            });
        }

        async function createPlayer(videoId) {
            await loadYouTubeAPI();
            if (youtubePlayer) youtubePlayer.loadVideoById(videoId);
            else {
                youtubePlayer = new YT.Player('youtube-player-hidden', {
                    height: '0', width: '0', videoId,
                    playerVars: { autoplay: 1, controls: 0 },
                    events: {
                        onReady: () => { isPlaying = true; triggerStateChange(); },
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

        function triggerStateChange() {
            onStateChangeCallbacks.forEach(cb => cb(getState()));
        }

        function getState() {
            if (!youtubePlayer) return { current: null, isPlaying: false, currentTime: 0, duration: 0 };
            const currentSong = playlist[currentIndex] || null;
            return {
                current: currentSong,
                isPlaying,
                currentTime: youtubePlayer.getCurrentTime() || 0,
                duration: youtubePlayer.getDuration() || 0
            };
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
            onStateChange(callback) { onStateChangeCallbacks.push(callback); },
            getState
        };
    })();

    // --------------------------------------------------------
    // Mini reproductor (básico)
    // --------------------------------------------------------
    class MiniPlayerLobby {
        constructor() {
            this.container = DOM.miniPlayerContainer;
            this.toggleBtn = DOM.musicToggleBtn;
            this.toggleIcon = DOM.musicToggleIcon;
            this.cover = DOM.miniPlayerCover;
            this.title = DOM.miniPlayerTitle;
            this.playPauseBtn = DOM.miniPlayPause;
            this.prevBtn = DOM.miniPrev;
            this.nextBtn = DOM.miniNext;
            this.closeBtn = DOM.miniClose;
            this.progressBar = DOM.miniProgressBar;
            this.isVisible = false;

            if (!this.container) return;
            this.initEventListeners();
            this.unsubscribe = MusicPlayer.onStateChange(state => this.updateUI(state));
        }
        initEventListeners() {
            this.playPauseBtn?.addEventListener('click', () => MusicPlayer.togglePlayPause());
            this.prevBtn?.addEventListener('click', () => MusicPlayer.prev());
            this.nextBtn?.addEventListener('click', () => MusicPlayer.next());
            this.closeBtn?.addEventListener('click', () => this.hide());
            this.toggleBtn?.addEventListener('click', () => this.show());
        }
        show() { if (this.container) { this.container.style.display = 'block'; this.toggleBtn.style.display = 'none'; this.isVisible = true; } }
        hide() { if (this.container) { this.container.style.display = 'none'; this.toggleBtn.style.display = 'flex'; this.isVisible = false; } }
        updateUI(state) {
            if (!this.container) return;
            if (state.current) {
                this.cover.src = state.current.cover;
                this.toggleIcon.src = state.current.cover;
                this.title.textContent = state.current.name;
                this.playPauseBtn.textContent = state.isPlaying ? '⏸' : '▶';
                const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
                this.progressBar.style.width = progress + '%';
                if (!this.isVisible) this.toggleBtn.style.display = 'flex';
                else this.toggleBtn.style.display = 'none';
            } else {
                this.container.style.display = 'none';
                this.toggleBtn.style.display = 'none';
            }
        }
    }

    // --------------------------------------------------------
    // NameValidator y ColorSelector (mínimos)
    // --------------------------------------------------------
    class NameValidator {
        constructor() {
            this.pattern = /^[a-zA-Z0-9_-]{3,20}$/;
        }
        validar_formato(nombre) {
            if (!nombre || nombre.length < 3) return { valid: false, msg: 'Mínimo 3 caracteres' };
            if (!this.pattern.test(nombre)) return { valid: false, msg: 'Solo letras, números, guiones y guiones bajos' };
            return { valid: true, msg: '' };
        }
        async validar_con_debounce(nombre) {
            return this.validar_formato(nombre);
        }
    }

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
            this.container = DOM.colorPalette || document.getElementById('color-palette');
            if (this.container) this.renderPalette();
        }
        renderPalette() {
            this.container.innerHTML = '';
            this.colors.forEach(c => {
                const btn = document.createElement('button');
                btn.className = 'color-btn';
                btn.dataset.color = c.hex;
                btn.innerHTML = `<span class="color-circle" style="background: ${c.hex};"></span><span class="color-label">${c.name}</span>`;
                btn.addEventListener('click', () => this.seleccionar_color(c.hex, c.name));
                this.container.appendChild(btn);
            });
        }
        seleccionar_color(hex, name) {
            document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('selected'));
            const selectedBtn = document.querySelector(`.color-btn[data-color="${hex}"]`);
            if (selectedBtn) selectedBtn.classList.add('selected');
            this.selected = { hex, name };
            if (DOM.colorName) DOM.colorName.innerHTML = `Color seleccionado: <strong style="color: ${hex};">${name}</strong>`;
            if (DOM.previewName) DOM.previewName.style.color = hex;
            validar_completitud();
        }
    }

    function validar_completitud() {
        if (!DOM.btnEnter) return;
        const nombre = DOM.nameInput?.value.trim() || '';
        const colorOk = colorSelector?.selected !== null;
        const nombreOk = nombre.length >= 3 && /^[a-zA-Z0-9_-]{3,20}$/.test(nombre);
        DOM.btnEnter.disabled = !(nombreOk && colorOk);
        DOM.btnEnter.classList.toggle('enabled', nombreOk && colorOk);
    }

    async function acceder() {
        alert('Función de registro desactivada temporalmente');
    }

    // --------------------------------------------------------
    // RankingManager (mínimo)
    // --------------------------------------------------------
    class RankingManager {
        constructor() {
            this.observers = [];
        }
        async cargar_ranking() {
            try {
                const data = await window.db?.getRanking() || [];
                this.observers = data.map((obs, index) => ({ rank: index + 1, ...obs }));
                this.render_ranking();
            } catch (e) { console.error(e); }
        }
        render_ranking() {
            if (!DOM.rankingList) return;
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
                        ${obs.show_country ? `<span class="country">${obs.country}</span>` : ''}
                        <span class="accesses">${obs.accesses}</span>
                    </div>
                `;
                DOM.rankingList.appendChild(entry);
            });
            if (DOM.observerCount) DOM.observerCount.textContent = `#${this.observers.length} activos`;
        }
        start_auto_update() {}
    }

    // --------------------------------------------------------
    // Modales (solo apertura/cierre)
    // --------------------------------------------------------
    function setupModal(modalElement, closeSelectors) {
        if (!modalElement) return;
        const closeButtons = closeSelectors.map(sel => modalElement.querySelector(sel)).filter(b => b);
        closeButtons.forEach(btn => btn.addEventListener('click', () => modalElement.classList.remove('visible')));
        const overlay = modalElement.querySelector('.galeria-overlay, .comunidad-overlay, .identidad-overlay, .temas-overlay');
        if (overlay) overlay.addEventListener('click', (e) => {
            if (e.target === overlay) modalElement.classList.remove('visible');
        });
    }

    // --------------------------------------------------------
    // Menú Sidebar
    // --------------------------------------------------------
    class MenuSidebar {
        constructor() {
            DOM.btnGaleria?.addEventListener('click', () => DOM.galeriaModal?.classList.add('visible'));
            DOM.btnComunidad?.addEventListener('click', () => DOM.comunidadModal?.classList.add('visible'));
            DOM.btnIdentidad?.addEventListener('click', () => DOM.identidadModal?.classList.add('visible'));
            DOM.btnTemas?.addEventListener('click', () => DOM.temasModal?.classList.add('visible'));
        }
    }

    // --------------------------------------------------------
    // Lobby
    // --------------------------------------------------------
    async function loadLobbyData() {
        try {
            const res = await fetch(`data.json?t=${Date.now()}`);
            const data = await res.json();
            if (DOM.versionBadge) DOM.versionBadge.textContent = data.version;
            if (DOM.budget) DOM.budget.textContent = '$' + data.financials.remaining.toFixed(2);
            if (DOM.invested) DOM.invested.textContent = '$' + data.financials.invested.toFixed(2);
            if (DOM.statusBadge) DOM.statusBadge.textContent = data.financials.status;
            if (DOM.evolution) DOM.evolution.textContent = data.evolution_state;
            if (DOM.logContainer) {
                DOM.logContainer.innerHTML = '';
                data.logs.forEach(log => {
                    const entry = document.createElement('div');
                    entry.className = 'log-entry';
                    entry.innerHTML = `<span class="log-timestamp">${log.timestamp}</span><span class="log-id">${log.id}</span><span class="log-msg">${log.msg}</span>`;
                    DOM.logContainer.appendChild(entry);
                });
            }
        } catch (e) {
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
            data.logs.forEach(log => {
                const entry = document.createElement('div');
                entry.className = 'log-entry';
                entry.innerHTML = `<span class="log-timestamp">${log.timestamp}</span><span class="log-id">${log.id}</span><span class="log-msg">${log.msg}</span>`;
                DOM.logContainer.appendChild(entry);
            });
        }
    }

    const EXPIRATION_DATE = new Date(2027, 1, 16);
    function updateCountdown() {
        if (!DOM.countdown) return;
        const diff = EXPIRATION_DATE - new Date();
        if (diff <= 0) { DOM.countdown.textContent = '0d 00h 00m 00s'; return; }
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        DOM.countdown.textContent = `${d}d ${h.toString().padStart(2,'0')}h ${m.toString().padStart(2,'0')}m ${s.toString().padStart(2,'0')}s`;
    }
    setInterval(updateCountdown, 1000);

    function updateTimestampBadge() {
        if (DOM.timestampBadge) DOM.timestampBadge.textContent = new Date().toTimeString().slice(0,8);
    }
    setInterval(updateTimestampBadge, 1000);

    // --------------------------------------------------------
    // Inicialización
    // --------------------------------------------------------
    async function init() {
        console.log('Inicializando ZeroFlen...');
        await loadLobbyData();

        // Configurar modales
        setupModal(DOM.galeriaModal, ['.btn-close-galeria', '.btn-volver-galeria']);
        setupModal(DOM.comunidadModal, ['.btn-close-comunidad', '.btn-volver-comunidad']);
        setupModal(DOM.identidadModal, ['.btn-close-identidad', '.btn-volver-identidad']);
        setupModal(DOM.temasModal, ['.btn-close-temas']); // temas no tiene volver

        // Inicializar componentes
        window.rankingManager = new RankingManager();
        await window.rankingManager.cargar_ranking();

        new MenuSidebar();
        new MiniPlayerLobby();

        // Gatekeeper básico
        if (localStorage.getItem('observer')) {
            DOM.gatekeeperModal?.classList.remove('active');
        } else {
            DOM.gatekeeperModal?.classList.add('active');
            nameValidator = new NameValidator();
            colorSelector = new ColorSelector();
            DOM.nameInput?.addEventListener('input', () => {
                const nombre = DOM.nameInput.value.trim();
                if (DOM.previewName) DOM.previewName.textContent = nombre || 'Ingresa tu nombre';
                const resultado = nameValidator.validar_formato(nombre);
                if (DOM.nameStatus) {
                    DOM.nameStatus.textContent = resultado.msg;
                    DOM.nameStatus.className = 'name-status ' + (resultado.valid ? 'valid' : 'invalid');
                }
                validar_completitud();
            });
            DOM.btnEnter?.addEventListener('click', acceder);
        }

        // Botones móviles
        DOM.btnToggleRankingMobile?.addEventListener('click', () => DOM.rankingSidebar?.classList.toggle('visible'));
        DOM.btnToggleMenuMobile?.addEventListener('click', () => document.querySelector('.menu-sidebar')?.classList.toggle('visible'));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    // Reproductor oculto
    if (!document.getElementById('youtube-player-hidden')) {
        document.body.insertAdjacentHTML('beforeend', '<div id="youtube-player-hidden" style="display: none;"></div>');
    }
})();