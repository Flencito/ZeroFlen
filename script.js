/**
 * ZeroFlen v0.9 - Módulo principal (Lobby, ranking, reproductor, comunidad)
 * Adaptado para usar database.js, centinel.js, auth.js y con integración de Google
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

        // Modales
        comunidadModal: document.getElementById('comunidad-modal'),
        temasModal: document.getElementById('temas-modal'),
        comunidadMensajes: document.getElementById('comunidad-mensajes'),
        comunidadInput: document.getElementById('comunidad-input'),
        btnTransmitir: document.getElementById('btn-transmitir'),
        temasGrid: document.getElementById('temas-grid'),
        btnTemasGuardar: document.getElementById('btn-temas-guardar')
    };

    // Exponer DOM para otros módulos (auth.js lo necesita)
    window.DOM = DOM;

    // --------------------------------------------------------
    // Estado global
    // --------------------------------------------------------
    window.currentObserver = null;
    window.pendingGoogle = null;

    let rankingManager = null;
    let nameValidator = null;
    let colorSelector = null;
    let menuSidebar = null; // AÑADIDO: para poder actualizarlo globalmente

    // --------------------------------------------------------
    // Reproductor global (MusicPlayer)
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
            return {
                current: currentSong,
                isPlaying: isPlaying,
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
            onStateChange(callback) { onStateChangeCallbacks.push(callback); return () => { onStateChangeCallbacks = onStateChangeCallbacks.filter(cb => cb !== callback); }; },
            getState
        };
    })();

    // --------------------------------------------------------
    // MiniPlayerLobby
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
            this.progressContainer = DOM.miniProgressContainer;
            this.progressBar = DOM.miniProgressBar;
            this.progressTooltip = DOM.miniProgressTooltip;
            this.isVisible = false;

            this.initEventListeners();
            this.setupProgressBar();
            this.unsubscribe = MusicPlayer.onStateChange(state => this.updateUI(state));
        }

        initEventListeners() {
            this.playPauseBtn.addEventListener('click', () => MusicPlayer.togglePlayPause());
            this.prevBtn.addEventListener('click', () => MusicPlayer.prev());
            this.nextBtn.addEventListener('click', () => MusicPlayer.next());
            this.closeBtn.addEventListener('click', () => this.hide());
            this.toggleBtn.addEventListener('click', () => this.show());
        }

        setupProgressBar() {
            if (!this.progressContainer) return;
            this.progressContainer.addEventListener('mousemove', (e) => {
                const rect = this.progressContainer.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = Math.max(0, Math.min(1, x / rect.width));
                const duration = MusicPlayer.getState().duration;
                if (duration > 0) {
                    const time = percent * duration;
                    this.progressTooltip.textContent = formatTime(time);
                    this.progressTooltip.style.left = x + 'px';
                    this.progressTooltip.style.display = 'block';
                }
            });
            this.progressContainer.addEventListener('mouseleave', () => { this.progressTooltip.style.display = 'none'; });
            this.progressContainer.addEventListener('click', (e) => {
                const rect = this.progressContainer.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = Math.max(0, Math.min(1, x / rect.width));
                const duration = MusicPlayer.getState().duration;
                if (duration > 0) {
                    const time = percent * duration;
                    MusicPlayer.seekTo(time);
                }
            });
        }

        show() { this.container.style.display = 'block'; this.toggleBtn.style.display = 'none'; this.isVisible = true; }
        hide() { this.container.style.display = 'none'; this.toggleBtn.style.display = 'flex'; this.isVisible = false; }

        updateUI(state) {
            if (state.current) {
                this.cover.src = state.current.cover;
                this.toggleIcon.src = state.current.cover;
                this.title.textContent = state.current.name;
                this.playPauseBtn.textContent = state.isPlaying ? '⏸' : '▶';
                if (state.isPlaying) {
                    this.cover.classList.add('reproduciendo');
                    this.toggleIcon.style.animationPlayState = 'running';
                } else {
                    this.cover.classList.remove('reproduciendo');
                    this.toggleIcon.style.animationPlayState = 'paused';
                }
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
    // NameValidator
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

        async validar_unicidad(nombre) {
            try {
                const data = await window.db.getObserverByName(nombre);
                return { valid: !data, msg: data ? '❌ Nombre ya existe' : '✅ Nombre disponible' };
            } catch (error) {
                console.error('Error validando unicidad:', error);
                return { valid: false, msg: 'Error al validar' };
            }
        }

        async validar_con_debounce(nombre) {
            clearTimeout(this.debounceTimer);
            const formatoOk = this.validar_formato(nombre);
            if (!formatoOk.valid) return formatoOk;
            return new Promise(resolve => {
                this.debounceTimer = setTimeout(async () => {
                    const unicidadOk = await this.validar_unicidad(nombre);
                    resolve(unicidadOk);
                }, 500);
            });
        }
    }

    // --------------------------------------------------------
    // ColorSelector (con reintento)
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
            this.container = document.getElementById('color-palette');
            if (!this.container) {
                console.warn('ColorSelector: No se encontró #color-palette, reintentando...');
                setTimeout(() => {
                    this.container = document.getElementById('color-palette');
                    if (this.container) {
                        this.renderPalette();
                    } else {
                        console.error('ColorSelector: No se pudo encontrar el contenedor después de reintentar');
                    }
                }, 200);
                return;
            }
            this.renderPalette();
        }

        renderPalette() {
            if (!this.container) return;
            this.container.innerHTML = '';
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
                this.container.appendChild(btn);
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
        const showCountry = DOM.showCountryToggle ? DOM.showCountryToggle.checked : true;
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
            console.warn('Geolocalización falló, usando bandera por defecto');
        }

        DOM.btnEnter.classList.add('loading');
        DOM.btnEnter.innerHTML = '<span class="spinner-small"></span> ACCEDIENDO...';

        const accessKey = await window.generarAccessKeyUnico();

        try {
            const newObserverData = {
                name: nombre,
                color: color,
                country: country,
                accesses: 1,
                show_country: showCountry,
                access_key: accessKey
            };

            // Si hay datos pendientes de Google, añadimos google_id
            if (window.pendingGoogle && window.pendingGoogle.googleId) {
                newObserverData.google_id = window.pendingGoogle.googleId;
            }

            const newObserver = await window.db.insertObserver(newObserverData);

            // Limpiar pendingGoogle y restaurar botón de Google
            if (window.pendingGoogle) {
                window.pendingGoogle = null;
                const googleBtn = document.querySelector('.google-auth');
                if (googleBtn) googleBtn.style.display = 'block';
            }

            const observer = {
                id: newObserver.id,
                name: newObserver.name,
                color: newObserver.color,
                country: newObserver.country,
                show_country: newObserver.show_country,
                access_key: newObserver.access_key
            };
            localStorage.setItem('observer', JSON.stringify(observer));
            window.currentObserver = observer;
            cerrarGatekeeper();

            menuSidebar = new MenuSidebar(window.currentObserver); // AÑADIDO: asignar a variable global
            window.menuSidebar = menuSidebar; // AÑADIDO: exponer globalmente
            await rankingManager.cargar_ranking();

        } catch (error) {
            if (error.code === '23505') alert('Error: el nombre ya existe');
            else alert('Error al registrar: ' + error.message);
        } finally {
            DOM.btnEnter.classList.remove('loading');
            DOM.btnEnter.innerHTML = '🚀 ACCEDER AL LOBBY';
        }
    }

    function cerrarGatekeeper() { DOM.gatekeeperModal.classList.remove('active'); }
    function abrirGatekeeper() { DOM.gatekeeperModal.classList.add('active'); }

    // --------------------------------------------------------
    // RankingManager
    // --------------------------------------------------------
    class RankingManager {
        constructor() {
            this.observers = [];
            this.updateInterval = null;
        }

        async cargar_ranking() {
            try {
                const data = await window.db.getRanking();
                this.observers = data.map((obs, index) => ({ rank: index + 1, ...obs }));
                this.render_ranking();
                if (window.currentObserver) this.actualizar_observador_actual();
            } catch (error) { console.error('Error cargando ranking:', error); }
        }

        render_ranking() {
            DOM.rankingList.innerHTML = '';
            this.observers.forEach(obs => {
                const entry = document.createElement('div');
                entry.className = 'ranking-entry';
                const countryHtml = obs.show_country ? `<span class="country">${obs.country}</span>` : '';
                entry.innerHTML = `
                    <div class="entry-left">
                        <span class="rank">${obs.rank}</span>
                        <span class="observer-name" style="color: ${obs.color};">${obs.name}</span>
                    </div>
                    <div class="entry-right">
                        ${countryHtml}
                        <span class="accesses">${obs.accesses.toLocaleString()}</span>
                    </div>
                `;
                DOM.rankingList.appendChild(entry);
            });
            DOM.observerCount.textContent = `#${this.observers.length} activos`;
        }

        actualizar_observador_actual() {
            const obs = this.observers.find(o => o.name === window.currentObserver.name);
            if (obs) {
                DOM.rankingCurrent.innerHTML = `
                    <p class="current-label">TÚ ERES:</p>
                    <p class="current-name breathe" style="color: ${window.currentObserver.color};">${window.currentObserver.name}</p>
                    <div class="current-details">
                        <span class="current-country">${window.currentObserver.show_country ? window.currentObserver.country : '🔒'}</span>
                        <p class="current-rank">Rango: #${obs.rank}</p>
                        <p class="current-accesses">Accesos: ${obs.accesses.toLocaleString()}</p>
                    </div>
                `;
            } else {
                DOM.rankingCurrent.innerHTML = `
                    <p class="current-label">TÚ ERES:</p>
                    <p class="current-name breathe" style="color: ${window.currentObserver.color};">${window.currentObserver.name}</p>
                    <div class="current-details"><p>Esperando datos...</p></div>
                `;
            }
        }

        async registrar_acceso() {
            if (!window.currentObserver) return;
            try {
                const obs = await window.db.getObserverById(window.currentObserver.id);
                if (obs) {
                    const newAccesses = obs.accesses + 1;
                    await window.db.updateObserver(window.currentObserver.id, { accesses: newAccesses, last_access: new Date() });
                }
                await this.cargar_ranking();
            } catch (error) { console.error('Error en check-in:', error); }
        }

        start_auto_update() {
            if (this.updateInterval) clearInterval(this.updateInterval);
            this.updateInterval = setInterval(() => this.cargar_ranking(), 5000);
        }
        stop_auto_update() {
            if (this.updateInterval) { clearInterval(this.updateInterval); this.updateInterval = null; }
        }
    }

    // --------------------------------------------------------
    // Galería Modal
    // --------------------------------------------------------
    class GaleriaModal {
        constructor() {
            this.modal = null;
            this.proyectos = [
                { id: 1, name: 'Brighter', category: 'Hazbin Hotel', youtubeId: 'eTpEdZoAYbM', cover: 'https://img.youtube.com/vi/eTpEdZoAYbM/0.jpg' },
                { id: 2, name: 'Jester', category: 'The Amazing Digital Circus', youtubeId: 'FxOFYp_ZA8M', cover: 'https://img.youtube.com/vi/FxOFYp_ZA8M/0.jpg' },
                { id: 3, name: 'I Cant Control Myself', category: 'Fnaf', youtubeId: 'YgiopHEUcqI', cover: 'https://img.youtube.com/vi/YgiopHEUcqI/0.jpg' },
                { id: 4, name: 'Gatekeeper', category: 'Seguridad', youtubeId: '', cover: 'https://via.placeholder.com/300/0d1117/39FF14?text=GATEKEEPER' },
                { id: 5, name: 'Ranking', category: 'Social', youtubeId: '', cover: 'https://via.placeholder.com/300/0d1117/39FF14?text=RANKING' },
                { id: 6, name: 'Mutación', category: 'Música', youtubeId: '', cover: 'https://via.placeholder.com/300/0d1117/39FF14?text=MUTACION' },
                { id: 7, name: 'Neon Breath', category: 'Arte', youtubeId: '', cover: 'https://via.placeholder.com/300/0d1117/39FF14?text=NEON' },
                { id: 8, name: 'ZeroFlen', category: 'Core', youtubeId: '', cover: 'https://via.placeholder.com/300/0d1117/39FF14?text=ZEROFLEN' }
            ];
            this.currentPlaylist = this.proyectos.filter(p => p.youtubeId);
            this.unsubscribe = MusicPlayer.onStateChange(state => this.syncWithPlayer(state));
        }

        abrir() {
            this.crearModal();
            setTimeout(() => this.modal.classList.add('visible'), 10);
        }

        crearModal() {
            const html = `
                <div id="galeria-modal" class="galeria-modal">
                    <div class="galeria-overlay"></div>
                    <div class="galeria-container">
                        <div class="galeria-header">
                            <h2>🎵 MUTACIÓN MÚSICA - GALERÍA</h2>
                            <button class="btn-close-galeria">✕</button>
                        </div>
                        <div class="galeria-grid" id="galeria-content"></div>
                        <div class="reproductor-container" id="reproductor-container" style="display: none;">
                            <div class="disco-container">
                                <img id="disco-imagen" class="disco-rotatorio" src="" alt="cover">
                            </div>
                            <div class="progress-bar-container" id="progress-bar-container">
                                <div class="progress-bar-neon" id="progress-bar" style="width: 0%;"></div>
                                <div class="progress-tooltip" id="progress-tooltip" style="display: none;">0:00</div>
                            </div>
                            <div class="controles">
                                <button class="control-btn" id="prev-btn">⏮ PREV</button>
                                <button class="control-btn" id="play-pause-btn">▶ PLAY</button>
                                <button class="control-btn" id="next-btn">⏭ NEXT</button>
                            </div>
                            <div class="tiempo-info">
                                <span id="tiempo-actual">0:00</span> / <span id="tiempo-duracion">0:00</span>
                            </div>
                        </div>
                        <div class="galeria-footer">
                            <button class="btn-volver">◄ VOLVER AL LOBBY</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
            this.modal = document.getElementById('galeria-modal');
            this.cargarProyectos();
            this.agregarEventos();
            this.syncWithPlayer(MusicPlayer.getState());
        }

        cargarProyectos() {
            const grid = document.getElementById('galeria-content');
            grid.innerHTML = this.proyectos.map(p => `
                <div class="gallery-card" data-id="${p.id}" data-youtube-id="${p.youtubeId}">
                    <div class="card-image-wrapper">
                        <img src="${p.cover}" alt="${p.name}" class="card-image" loading="lazy" />
                        <div class="card-overlay">
                            <button class="decode-btn" data-id="${p.id}">[ INICIAR DECODIFICACIÓN ]</button>
                        </div>
                        <div class="card-info">
                            <p class="card-title">${p.name}</p>
                            <p class="card-subtitle">${p.category}</p>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        agregarEventos() {
            this.modal.querySelector('.btn-close-galeria').addEventListener('click', () => this.cerrar());
            this.modal.querySelector('.btn-volver').addEventListener('click', () => this.cerrar());
            this.modal.querySelector('.galeria-overlay').addEventListener('click', () => this.cerrar());
            this.modal.querySelectorAll('.decode-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const proyecto = this.proyectos.find(p => p.id == id);
                    if (proyecto && proyecto.youtubeId) {
                        MusicPlayer.setPlaylist(this.currentPlaylist);
                        MusicPlayer.playSong(proyecto);
                        this.abrirReproductor(proyecto);
                    } else {
                        alert('Este proyecto no tiene video disponible');
                    }
                });
            });
        }

        abrirReproductor(proyecto) {
            this.modal.classList.add('glitch');
            setTimeout(() => this.modal.classList.remove('glitch'), 500);
            document.getElementById('galeria-content').style.display = 'none';
            const reproductorContainer = document.getElementById('reproductor-container');
            reproductorContainer.style.display = 'block';
            document.getElementById('disco-imagen').src = proyecto.cover;
            document.getElementById('play-pause-btn').addEventListener('click', () => MusicPlayer.togglePlayPause());
            document.getElementById('prev-btn').addEventListener('click', () => MusicPlayer.prev());
            document.getElementById('next-btn').addEventListener('click', () => MusicPlayer.next());
            this.setupProgressBar();
        }

        setupProgressBar() {
            const container = this.modal.querySelector('#progress-bar-container');
            const tooltip = this.modal.querySelector('#progress-tooltip');
            const bar = this.modal.querySelector('#progress-bar');
            container.addEventListener('mousemove', (e) => {
                const rect = container.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = Math.max(0, Math.min(1, x / rect.width));
                const duration = MusicPlayer.getState().duration;
                if (duration > 0) {
                    const time = percent * duration;
                    tooltip.textContent = formatTime(time);
                    tooltip.style.left = x + 'px';
                    tooltip.style.display = 'block';
                }
            });
            container.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
            container.addEventListener('click', (e) => {
                const rect = container.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = Math.max(0, Math.min(1, x / rect.width));
                const duration = MusicPlayer.getState().duration;
                if (duration > 0) {
                    const time = percent * duration;
                    MusicPlayer.seekTo(time);
                }
            });
        }

        syncWithPlayer(state) {
            if (!this.modal) return;
            const reproductorVisible = document.getElementById('reproductor-container')?.style.display === 'block';
            if (!reproductorVisible) return;
            if (state.current) {
                document.getElementById('disco-imagen').src = state.current.cover;
                document.getElementById('play-pause-btn').textContent = state.isPlaying ? '⏸ PAUSE' : '▶ PLAY';
                const current = state.currentTime;
                const duration = state.duration;
                const progress = duration > 0 ? (current / duration) * 100 : 0;
                document.getElementById('progress-bar').style.width = progress + '%';
                document.getElementById('tiempo-actual').textContent = formatTime(current);
                document.getElementById('tiempo-duracion').textContent = formatTime(duration);
                const disco = document.getElementById('disco-imagen');
                if (state.isPlaying) disco.classList.add('reproduciendo');
                else disco.classList.remove('reproduciendo');
            }
        }

        cerrar() {
            this.modal.classList.remove('visible');
            setTimeout(() => { this.modal.remove(); }, 500);
        }
    }

    // --------------------------------------------------------
    // ComunidadModal (con centinel y tiempo real mejorado)
    // --------------------------------------------------------
    class ComunidadModal {
        constructor() {
            this.modal = DOM.comunidadModal;
            this.mensajesContainer = DOM.comunidadMensajes;
            this.input = DOM.comunidadInput;
            this.btnTransmitir = DOM.btnTransmitir;
            this.unsubscribe = null;
            this.initCloseButtons();
            this.initEvents();
        }

        initCloseButtons() {
            const closeBtn = this.modal.querySelector('.btn-close-comunidad');
            const volverBtn = this.modal.querySelector('.btn-volver-comunidad');
            if (closeBtn) closeBtn.addEventListener('click', () => this.cerrar());
            if (volverBtn) volverBtn.addEventListener('click', () => this.cerrar());
        }

        initEvents() {
            this.btnTransmitir.addEventListener('click', () => this.enviarMensaje());
            this.input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.enviarMensaje();
            });
        }

        async abrir() {
            this.modal.classList.add('visible');
            await this.cargarMensajes();
            this.suscribirse();
        }

        cerrar() {
            this.modal.classList.remove('visible');
            if (this.unsubscribe) {
                this.unsubscribe();
                this.unsubscribe = null;
            }
        }

        async cargarMensajes() {
            try {
                const mensajes = await window.db.getMessages();
                this.mensajesContainer.innerHTML = '';
                mensajes.forEach(msg => this.agregarMensajeAlDOM(msg));
                this.scrollAlFinal();
            } catch (error) {
                console.error('Error cargando mensajes:', error);
            }
        }

        agregarMensajeAlDOM(mensaje) {
            const autor = mensaje.observers;
            const msgDiv = document.createElement('div');
            msgDiv.className = 'mensaje';
            msgDiv.innerHTML = `
                <div class="mensaje-avatar" style="background: ${autor.color};">${autor.name.charAt(0).toUpperCase()}</div>
                <div class="mensaje-contenido">
                    <div class="mensaje-header">
                        <span class="mensaje-autor" style="color: ${autor.color};">${autor.name}</span>
                        <span class="mensaje-tiempo">${new Date(mensaje.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div class="mensaje-texto">${mensaje.contenido}</div>
                </div>
            `;
            this.mensajesContainer.appendChild(msgDiv);
        }

        scrollAlFinal() {
            this.mensajesContainer.scrollTop = this.mensajesContainer.scrollHeight;
        }

        // AÑADIDO: Suscripción mejorada con logs y canal único
        suscribirse() {
            const channelName = 'messages-channel-' + Date.now(); // nombre único
            this.unsubscribe = window.supabaseClient
                .channel(channelName)
                .on('postgres_changes', 
                    { event: 'INSERT', schema: 'public', table: 'messages' }, 
                    async (payload) => {
                        console.log('🔔 Nuevo mensaje en tiempo real:', payload);
                        const autor = await window.db.getObserverById(payload.new.autor_id);
                        if (autor) {
                            const nuevoMensaje = {
                                ...payload.new,
                                observers: { name: autor.name, color: autor.color, country: autor.country }
                            };
                            this.agregarMensajeAlDOM(nuevoMensaje);
                            this.scrollAlFinal();
                        }
                    })
                .subscribe();
        }

        async enviarMensaje() {
            const contenido = this.input.value.trim();
            if (!contenido || !window.currentObserver) return;

            const muteado = await window.centinel.estaMuteado(window.currentObserver.id);
            if (muteado) {
                alert('Estás muteado por 30 minutos. No puedes enviar mensajes.');
                return;
            }

            if (window.centinel.escanearMensaje(contenido)) {
                await window.centinel.procesarInfraccion(window.currentObserver.id, contenido);
                const warning = document.createElement('div');
                warning.className = 'mute-warning';
                warning.textContent = '⚠️ Lenguaje inapropiado detectado. Esta infracción será registrada.';
                this.mensajesContainer.appendChild(warning);
                setTimeout(() => warning.remove(), 5000);
                return;
            }

            try {
                const nuevoMensaje = await window.db.insertMessage({ contenido, autor_id: window.currentObserver.id });
                const mensajeCompleto = {
                    ...nuevoMensaje,
                    observers: { name: window.currentObserver.name, color: window.currentObserver.color, country: window.currentObserver.country }
                };
                this.agregarMensajeAlDOM(mensajeCompleto);
                this.scrollAlFinal();
                this.input.value = '';
            } catch (error) {
                console.error('Error enviando mensaje:', error);
                alert('Error al enviar mensaje');
            }
        }
    }

    // --------------------------------------------------------
    // IdentidadModal (con cambio de nombre y actualización del menú)
    // --------------------------------------------------------
    class IdentidadModal {
        constructor() {
            this.modal = null;
            this.toggle = null;
            this.nameInput = null;
        }

        abrir() {
            this.crearModal();
            setTimeout(() => this.modal.classList.add('visible'), 10);
        }

        crearModal() {
            const html = `
                <div id="identidad-modal" class="identidad-modal">
                    <div class="identidad-overlay"></div>
                    <div class="identidad-container">
                        <div class="identidad-header">
                            <h2>👤 IDENTIDAD DEL OBSERVADOR</h2>
                            <button class="btn-close-identidad">✕</button>
                        </div>
                        <div class="identidad-content">
                            <div class="identidad-campo">
                                <label class="label">NOMBRE</label>
                                <input type="text" id="identidad-nombre" class="input-name" value="${window.currentObserver.name}" maxlength="20">
                            </div>
                            <p><strong>Color:</strong> <span style="color: ${window.currentObserver.color};">${window.currentObserver.color}</span></p>
                            <p><strong>País:</strong> ${window.currentObserver.country}</p>
                            <div class="identidad-toggle">
                                <span class="identidad-toggle-label">Mostrar país en el ranking</span>
                                <div class="toggle-switch">
                                    <input type="checkbox" id="identidad-show-country" ${window.currentObserver.show_country ? 'checked' : ''}>
                                    <label for="identidad-show-country" class="toggle-label"></label>
                                </div>
                            </div>
                            <div class="identidad-clave">
                                <span class="clave-label">Llave de acceso:</span>
                                <span class="clave-valor" id="clave-valor">${window.currentObserver.access_key}</span>
                                <button class="btn-copiar" id="btn-copiar-clave">📋</button>
                            </div>
                            <div class="identidad-actions">
                                <button class="btn-identidad-guardar">GUARDAR CAMBIOS</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
            this.modal = document.getElementById('identidad-modal');
            this.toggle = document.getElementById('identidad-show-country');
            this.nameInput = document.getElementById('identidad-nombre');
            this.agregarEventos();
        }

        agregarEventos() {
            this.modal.querySelector('.btn-close-identidad').addEventListener('click', () => this.cerrar());
            this.modal.querySelector('.identidad-overlay').addEventListener('click', () => this.cerrar());
            this.modal.querySelector('.btn-identidad-guardar').addEventListener('click', () => this.guardar());
            const btnCopiar = this.modal.querySelector('#btn-copiar-clave');
            if (btnCopiar) {
                btnCopiar.addEventListener('click', () => {
                    const clave = document.getElementById('clave-valor').textContent;
                    navigator.clipboard.writeText(clave).then(() => {
                        alert('Clave copiada al portapapeles');
                    });
                });
            }
        }

        async guardar() {
            const nuevoNombre = this.nameInput.value.trim();
            const nuevoShowCountry = this.toggle.checked;

            if (!nuevoNombre || nuevoNombre.length < 3 || !/^[a-zA-Z0-9_-]{3,20}$/.test(nuevoNombre)) {
                alert('Nombre inválido. Debe tener entre 3 y 20 caracteres (letras, números, guiones)');
                return;
            }

            if (nuevoNombre !== window.currentObserver.name) {
                const existe = await window.db.getObserverByName(nuevoNombre);
                if (existe) {
                    alert('Ese nombre ya está en uso');
                    return;
                }
            }

            try {
                await window.db.updateObserver(window.currentObserver.id, {
                    name: nuevoNombre,
                    show_country: nuevoShowCountry
                });

                window.currentObserver.name = nuevoNombre;
                window.currentObserver.show_country = nuevoShowCountry;
                localStorage.setItem('observer', JSON.stringify(window.currentObserver));

                // Actualizar el perfil en el menú (AÑADIDO)
                if (window.menuSidebar) {
                    window.menuSidebar.actualizarPerfil();
                }

                await rankingManager.cargar_ranking();

                this.cerrar();
            } catch (error) {
                console.error('Error al guardar cambios:', error);
                alert('Error al guardar');
            }
        }

        cerrar() {
            this.modal.classList.remove('visible');
            setTimeout(() => {
                this.modal.remove();
            }, 500);
        }
    }

    // --------------------------------------------------------
    // TemasModal
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
        if (themeId === 'default') {
            document.body.removeAttribute('data-theme');
        } else {
            document.body.setAttribute('data-theme', themeId);
        }
    }

    // --------------------------------------------------------
    // Menú Sidebar
    // --------------------------------------------------------
    class MenuSidebar {
        constructor(observer) {
            this.observer = observer;
            this.actualizarPerfil();
            DOM.btnGaleria.addEventListener('click', () => new GaleriaModal().abrir());
            DOM.btnComunidad.addEventListener('click', () => new ComunidadModal().abrir());
            DOM.btnIdentidad.addEventListener('click', () => new IdentidadModal().abrir());
            DOM.btnTemas.addEventListener('click', () => new TemasModal().abrir());
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
    // Inicialización
    // --------------------------------------------------------
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

        menuSidebar = new MenuSidebar(window.currentObserver); // AÑADIDO: asignar a variable global
        window.menuSidebar = menuSidebar; // AÑADIDO: exponer globalmente

        if (DOM.miniPlayerContainer && DOM.musicToggleBtn) {
            new MiniPlayerLobby();
        }

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