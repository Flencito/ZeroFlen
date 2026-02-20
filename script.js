/**
 * ZeroFlen v0.8 - Con Supabase + Reproductor + Comunidad + Identidad + Temas + Identity Key
 */

(function() {
    // --------------------------------------------------------
    // Configuración de Supabase
    // --------------------------------------------------------
    const SUPABASE_URL = 'https://vzfuejudjrztuawlxrpd.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6ZnVlanVkanJ6dHVhd2x4cnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzgyMzMsImV4cCI6MjA4Njk1NDIzM30.DWpOGLkW3aEW7q3flbX0iGf05Nmd_MiZMo0LWbHX5BY';

    const { createClient } = supabase;
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --------------------------------------------------------
    // Datos de respaldo para el lobby
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
    // Lista de palabras para la llave de acceso
    // --------------------------------------------------------
    const TECH_WORDS = ['NEON', 'CORE', 'GHOST', 'VOID', 'ATOM', 'BYTE', 'CYBER', 'DIGITAL', 'ECHO', 'FLUX', 'GRID', 'HACK', 'ION', 'JAVA', 'KERNEL', 'LOOP', 'MATRIX', 'NODE', 'OCTAL', 'PIXEL', 'QUANTUM', 'RADIO', 'SIGNAL', 'TERMINAL', 'ULTRA', 'VECTOR', 'WAVE', 'XENON', 'YOTT', 'ZERO'];

    function generarAccessKey() {
        const word = TECH_WORDS[Math.floor(Math.random() * TECH_WORDS.length)];
        const number = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `${word}${number}`;
    }

    async function generarAccessKeyUnico() {
        let attempts = 0;
        while (attempts < 10) {
            const key = generarAccessKey();
            const { data, error } = await supabaseClient
                .from('observers')
                .select('id')
                .eq('access_key', key)
                .maybeSingle();
            if (!error && !data) return key;
            attempts++;
        }
        // Fallback: usar timestamp
        return `ZERO${Date.now().toString().slice(-4)}`;
    }

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
        colorPalette: document.getElementById('color-palette'),
        colorName: document.getElementById('color-name'),
        previewName: document.getElementById('preview-name'),
        btnEnter: document.getElementById('btn-enter'),
        showCountryToggle: document.getElementById('show-country-toggle'),
        // Nuevos elementos para login
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
        menuPreview: document.getElementById('menu-gallery-preview'),
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
        miniProgressTooltip: document.getElementById('mini-progress-tooltip')
    };

    // --------------------------------------------------------
    // Estado global
    // --------------------------------------------------------
    let currentObserver = null; // { id, name, color, country, show_country, access_key }
    let rankingManager = null;
    let nameValidator = null;
    let colorSelector = null;

    // --------------------------------------------------------
    // Reproductor global (singleton)
    // --------------------------------------------------------
    const MusicPlayer = (function() {
        let playlist = [];
        let currentIndex = 0;
        let isPlaying = false;
        let progressInterval = null;
        let youtubePlayer = null;
        let onStateChangeCallbacks = [];

        function loadYouTubeAPI() {
            if (window.YT && window.YT.Player) {
                return Promise.resolve();
            }
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
            if (youtubePlayer) {
                youtubePlayer.loadVideoById(videoId);
            } else {
                youtubePlayer = new YT.Player('youtube-player-hidden', {
                    height: '0',
                    width: '0',
                    videoId: videoId,
                    playerVars: {
                        autoplay: 1,
                        controls: 0,
                        disablekb: 1,
                        fs: 0,
                        modestbranding: 1,
                        playsinline: 1
                    },
                    events: {
                        onReady: () => {
                            startProgressInterval();
                            isPlaying = true;
                            triggerStateChange();
                        },
                        onStateChange: (e) => {
                            if (e.data === YT.PlayerState.PLAYING) {
                                isPlaying = true;
                            } else if (e.data === YT.PlayerState.PAUSED) {
                                isPlaying = false;
                            } else if (e.data === YT.PlayerState.ENDED) {
                                next();
                            }
                            triggerStateChange();
                        }
                    }
                });
            }
        }

        function startProgressInterval() {
            if (progressInterval) clearInterval(progressInterval);
            progressInterval = setInterval(() => {
                if (youtubePlayer && isPlaying) {
                    triggerStateChange();
                }
            }, 100);
        }

        function triggerStateChange() {
            onStateChangeCallbacks.forEach(cb => cb(getState()));
        }

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
            setPlaylist(songs) {
                playlist = songs;
            },
            playSong(song) {
                const index = playlist.findIndex(s => s.id === song.id);
                if (index !== -1) currentIndex = index;
                createPlayer(song.youtubeId);
            },
            play() {
                if (youtubePlayer) {
                    youtubePlayer.playVideo();
                    isPlaying = true;
                    triggerStateChange();
                }
            },
            pause() {
                if (youtubePlayer) {
                    youtubePlayer.pauseVideo();
                    isPlaying = false;
                    triggerStateChange();
                }
            },
            togglePlayPause() {
                if (isPlaying) this.pause(); else this.play();
            },
            seekTo(seconds) {
                if (youtubePlayer) {
                    youtubePlayer.seekTo(seconds, true);
                    triggerStateChange();
                }
            },
            next() {
                if (playlist.length === 0) return;
                currentIndex = (currentIndex + 1) % playlist.length;
                const nextSong = playlist[currentIndex];
                createPlayer(nextSong.youtubeId);
            },
            prev() {
                if (playlist.length === 0) return;
                currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
                const prevSong = playlist[currentIndex];
                createPlayer(prevSong.youtubeId);
            },
            onStateChange(callback) {
                onStateChangeCallbacks.push(callback);
                return () => {
                    onStateChangeCallbacks = onStateChangeCallbacks.filter(cb => cb !== callback);
                };
            },
            getState
        };
    })();

    // --------------------------------------------------------
    // Mini‑reproductor en el lobby (con barra de progreso)
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

            this.progressContainer.addEventListener('mouseleave', () => {
                this.progressTooltip.style.display = 'none';
            });

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

        show() {
            this.container.style.display = 'block';
            this.toggleBtn.style.display = 'none';
            this.isVisible = true;
        }

        hide() {
            this.container.style.display = 'none';
            this.toggleBtn.style.display = 'flex';
            this.isVisible = false;
        }

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
                if (!this.isVisible) {
                    this.toggleBtn.style.display = 'flex';
                } else {
                    this.toggleBtn.style.display = 'none';
                }
            } else {
                this.container.style.display = 'none';
                this.toggleBtn.style.display = 'none';
            }
        }
    }

    // --------------------------------------------------------
    // NameValidator con debounce
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
                const { data, error } = await supabaseClient
                    .from('observers')
                    .select('name')
                    .eq('name', nombre)
                    .maybeSingle();
                if (error) throw error;
                const exists = data !== null;
                return { valid: !exists, msg: exists ? '❌ Nombre ya existe' : '✅ Nombre disponible' };
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
    // ColorSelector
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

        // Generar clave única
        const accessKey = await generarAccessKeyUnico();

        try {
            const { data, error } = await supabaseClient
                .from('observers')
                .insert([{ 
                    name: nombre, 
                    color: color, 
                    country: country, 
                    accesses: 1,
                    show_country: showCountry,
                    access_key: accessKey
                }])
                .select();

            if (error) {
                if (error.code === '23505') alert('Error: el nombre ya existe');
                else alert('Error al registrar: ' + error.message);
                return;
            }

            const observer = {
                id: data[0].id,
                name: data[0].name,
                color: data[0].color,
                country: data[0].country,
                show_country: data[0].show_country,
                access_key: data[0].access_key
            };
            localStorage.setItem('observer', JSON.stringify(observer));
            currentObserver = observer;
            cerrarGatekeeper();

            new MenuSidebar(currentObserver);
            await rankingManager.cargar_ranking();

        } catch (error) {
            alert('Error de conexión');
        } finally {
            DOM.btnEnter.classList.remove('loading');
            DOM.btnEnter.innerHTML = '🚀 ACCEDER AL LOBBY';
        }
    }

    async function loginConClave() {
        const clave = DOM.accessKeyInput.value.trim().toUpperCase();
        if (!clave) return;
        try {
            const { data, error } = await supabaseClient
                .from('observers')
                .select('*')
                .eq('access_key', clave)
                .maybeSingle();
            if (error) throw error;
            if (!data) {
                alert('Clave no válida');
                return;
            }
            const observer = {
                id: data.id,
                name: data.name,
                color: data.color,
                country: data.country,
                show_country: data.show_country,
                access_key: data.access_key
            };
            localStorage.setItem('observer', JSON.stringify(observer));
            currentObserver = observer;
            cerrarGatekeeper();
            // Recargar para aplicar la nueva identidad
            location.reload();
        } catch (e) {
            alert('Error al iniciar sesión');
        }
    }

    function cerrarGatekeeper() { DOM.gatekeeperModal.classList.remove('active'); }
    function abrirGatekeeper() { DOM.gatekeeperModal.classList.add('active'); }

    // --------------------------------------------------------
    // RankingManager (con Supabase)
    // --------------------------------------------------------
    class RankingManager {
        constructor() {
            this.observers = [];
            this.updateInterval = null;
        }

        async cargar_ranking() {
            try {
                const { data, error } = await supabaseClient
                    .from('observers')
                    .select('name, color, country, accesses, show_country')
                    .order('accesses', { ascending: false });
                if (error) throw error;
                this.observers = data.map((obs, index) => ({ rank: index + 1, ...obs }));
                this.render_ranking();
                if (currentObserver) this.actualizar_observador_actual();
            } catch (error) {
                console.error('Error cargando ranking:', error);
            }
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
            const obs = this.observers.find(o => o.name === currentObserver.name);
            if (obs) {
                DOM.rankingCurrent.innerHTML = `
                    <p class="current-label">TÚ ERES:</p>
                    <p class="current-name breathe" style="color: ${currentObserver.color};">${currentObserver.name}</p>
                    <div class="current-details">
                        <span class="current-country">${currentObserver.show_country ? currentObserver.country : '🔒'}</span>
                        <p class="current-rank">Rango: #${obs.rank}</p>
                        <p class="current-accesses">Accesos: ${obs.accesses.toLocaleString()}</p>
                    </div>
                `;
            } else {
                DOM.rankingCurrent.innerHTML = `
                    <p class="current-label">TÚ ERES:</p>
                    <p class="current-name breathe" style="color: ${currentObserver.color};">${currentObserver.name}</p>
                    <div class="current-details"><p>Esperando datos...</p></div>
                `;
            }
        }

        async registrar_acceso() {
            if (!currentObserver) return;
            try {
                const { data: obs, error: selectError } = await supabaseClient
                    .from('observers')
                    .select('accesses')
                    .eq('name', currentObserver.name)
                    .single();
                if (selectError) throw selectError;
                if (obs) {
                    const newAccesses = obs.accesses + 1;
                    await supabaseClient
                        .from('observers')
                        .update({ accesses: newAccesses, last_access: new Date() })
                        .eq('name', currentObserver.name);
                }
                await this.cargar_ranking();
            } catch (error) {
                console.error('Error en check-in:', error);
            }
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
    // Galería Modal (sin cambios)
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
            const reproductorVisible = document.getElementById('reproductor-container').style.display === 'block';
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
    // Modal Comunidad (en tiempo real)
    // --------------------------------------------------------
    class ComunidadModal {
        constructor() {
            this.modal = null;
            this.mensajesContainer = null;
            this.input = null;
            this.btnTransmitir = null;
            this.unsubscribe = null;
        }

        abrir() {
            this.crearModal();
            this.modal.classList.add('visible');
            this.cargarMensajes();
            this.suscribirseANuevosMensajes();
        }

        crearModal() {
            this.modal = document.getElementById('comunidad-modal');
            if (!this.modal) {
                const html = `
                    <div id="comunidad-modal" class="comunidad-modal">
                        <div class="comunidad-overlay"></div>
                        <div class="comunidad-container">
                            <div class="comunidad-header">
                                <h2>📡 FRECUENCIA COMUNIDAD</h2>
                                <button class="btn-close-comunidad">✕</button>
                            </div>
                            <div class="comunidad-mensajes" id="comunidad-mensajes"></div>
                            <div class="comunidad-input-area">
                                <input type="text" id="comunidad-input" class="comunidad-input" placeholder="Escribe tu mensaje..." maxlength="200">
                                <button class="btn-transmitir" id="btn-transmitir">TRANSMITIR</button>
                            </div>
                            <div class="comunidad-footer">
                                <button class="btn-volver-comunidad">◄ VOLVER AL LOBBY</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', html);
                this.modal = document.getElementById('comunidad-modal');
            }
            this.mensajesContainer = document.getElementById('comunidad-mensajes');
            this.input = document.getElementById('comunidad-input');
            this.btnTransmitir = document.getElementById('btn-transmitir');
            this.agregarEventos();
        }

        agregarEventos() {
            this.modal.querySelector('.btn-close-comunidad').addEventListener('click', () => this.cerrar());
            this.modal.querySelector('.btn-volver-comunidad').addEventListener('click', () => this.cerrar());
            this.modal.querySelector('.comunidad-overlay').addEventListener('click', () => this.cerrar());
            this.btnTransmitir.addEventListener('click', () => this.enviarMensaje());
            this.input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.enviarMensaje();
            });
        }

        async cargarMensajes() {
            try {
                const { data, error } = await supabaseClient
                    .from('messages')
                    .select(`
                        id,
                        contenido,
                        created_at,
                        autor_id,
                        observers!inner(name, color, country)
                    `)
                    .order('created_at', { ascending: true });
                if (error) throw error;
                this.mostrarMensajes(data);
            } catch (error) {
                console.error('Error cargando mensajes:', error);
            }
        }

        mostrarMensajes(mensajes) {
            this.mensajesContainer.innerHTML = '';
            mensajes.forEach(msg => this.agregarMensajeAlDOM(msg));
            this.scrollAlFinal();
        }

        agregarMensajeAlDOM(msg) {
            const mensajeDiv = document.createElement('div');
            mensajeDiv.className = 'mensaje';
            const autor = msg.observers;
            const inicial = autor.name.charAt(0).toUpperCase();
            const tiempo = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            mensajeDiv.innerHTML = `
                <div class="mensaje-avatar" style="background: ${autor.color};">${inicial}</div>
                <div class="mensaje-contenido">
                    <div class="mensaje-header">
                        <span class="mensaje-autor" style="color: ${autor.color};">${autor.name}</span>
                        <span class="mensaje-tiempo">${tiempo}</span>
                    </div>
                    <div class="mensaje-texto">${msg.contenido}</div>
                </div>
            `;
            this.mensajesContainer.appendChild(mensajeDiv);
        }

        scrollAlFinal() {
            this.mensajesContainer.scrollTop = this.mensajesContainer.scrollHeight;
        }

        suscribirseANuevosMensajes() {
            this.unsubscribe = supabaseClient
                .channel('messages-channel')
                .on('postgres_changes', 
                    { event: 'INSERT', schema: 'public', table: 'messages' }, 
                    async (payload) => {
                        const { data: autorData, error } = await supabaseClient
                            .from('observers')
                            .select('name, color, country')
                            .eq('id', payload.new.autor_id)
                            .single();
                        if (!error && autorData) {
                            const nuevoMensaje = {
                                ...payload.new,
                                observers: autorData
                            };
                            this.agregarMensajeAlDOM(nuevoMensaje);
                            this.scrollAlFinal();
                        } else {
                            this.cargarMensajes();
                        }
                    })
                .subscribe();
        }

        async enviarMensaje() {
            const contenido = this.input.value.trim();
            if (!contenido || !currentObserver) return;
            try {
                const { data, error } = await supabaseClient
                    .from('messages')
                    .insert([{ contenido, autor_id: currentObserver.id }])
                    .select();

                if (error) throw error;

                const nuevoMensaje = {
                    ...data[0],
                    observers: {
                        name: currentObserver.name,
                        color: currentObserver.color,
                        country: currentObserver.country
                    }
                };
                this.agregarMensajeAlDOM(nuevoMensaje);
                this.scrollAlFinal();

                this.input.value = '';
            } catch (error) {
                console.error('Error enviando mensaje:', error);
                alert('Error al enviar mensaje');
            }
        }

        cerrar() {
            if (this.unsubscribe) this.unsubscribe.unsubscribe();
            this.modal.classList.remove('visible');
            setTimeout(() => {
                this.modal.remove();
            }, 500);
        }
    }

    // --------------------------------------------------------
    // Modal Identidad (con clave)
    // --------------------------------------------------------
    class IdentidadModal {
        constructor() {
            this.modal = null;
            this.toggle = null;
        }

        abrir() {
            this.crearModal();
            this.modal.classList.add('visible');
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
                            <p class="identidad-info">
                                <strong>Nombre:</strong> ${currentObserver.name}<br>
                                <strong>Color:</strong> <span style="color: ${currentObserver.color};">${currentObserver.color}</span><br>
                                <strong>País:</strong> ${currentObserver.country}
                            </p>
                            <div class="identidad-toggle">
                                <span class="identidad-toggle-label">Mostrar país en el ranking</span>
                                <div class="toggle-switch">
                                    <input type="checkbox" id="identidad-show-country" ${currentObserver.show_country ? 'checked' : ''}>
                                    <label for="identidad-show-country" class="toggle-label"></label>
                                </div>
                            </div>
                            <div class="identidad-clave">
                                <span class="clave-label">Llave de acceso:</span>
                                <span class="clave-valor" id="clave-valor">${currentObserver.access_key}</span>
                                <button class="btn-copiar" id="btn-copiar-clave">📋</button>
                            </div>
                            <div class="identidad-actions">
                                <button class="btn-identidad-guardar">GUARDAR</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
            this.modal = document.getElementById('identidad-modal');
            this.toggle = document.getElementById('identidad-show-country');
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
            const nuevoValor = this.toggle.checked;
            if (nuevoValor === currentObserver.show_country) {
                this.cerrar();
                return;
            }
            try {
                const { error } = await supabaseClient
                    .from('observers')
                    .update({ show_country: nuevoValor })
                    .eq('id', currentObserver.id);
                if (error) throw error;
                currentObserver.show_country = nuevoValor;
                localStorage.setItem('observer', JSON.stringify(currentObserver));
                await rankingManager.cargar_ranking();
                this.cerrar();
            } catch (error) {
                console.error('Error al actualizar preferencia:', error);
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
    // Modal de selección de temas (Mutación Cromática)
    // --------------------------------------------------------
    class TemasModal {
        constructor() {
            this.modal = null;
            this.temas = [
                { id: 'default', nombre: 'Matrix Core', color: '#39FF14', preview: 'Verde neón' },
                { id: 'synthwave', nombre: 'Synthwave', color: '#ff00ff', preview: 'Magenta' },
                { id: 'deepsea', nombre: 'Deep Sea', color: '#00d4ff', preview: 'Cian profundo' },
                { id: 'amber', nombre: 'Amber', color: '#ffb000', preview: 'Ámbar retro' },
                { id: 'monochrome', nombre: 'Ghost', color: '#ffffff', preview: 'Blanco puro' }
            ];
            this.selectedTheme = document.body.getAttribute('data-theme') || 'default';
        }

        abrir() {
            const oldModal = document.getElementById('temas-modal');
            if (oldModal) oldModal.remove();

            this.crearModal();
            setTimeout(() => {
                this.modal.classList.add('visible');
            }, 10);
        }

        crearModal() {
            const html = `
                <div id="temas-modal" class="temas-modal">
                    <div class="temas-overlay"></div>
                    <div class="temas-container">
                        <div class="temas-header">
                            <h2>🎨 MUTACIÓN CROMÁTICA</h2>
                            <button class="btn-close-temas">✕</button>
                        </div>
                        <div class="temas-content">
                            <p class="temas-descripcion">Elige la frecuencia visual de ZeroFlen:</p>
                            <div class="temas-grid" id="temas-grid">
                                ${this.temas.map(t => `
                                    <div class="tema-opcion ${t.id === this.selectedTheme ? 'selected' : ''}" data-tema="${t.id}">
                                        <div class="tema-color" style="background: ${t.color}; box-shadow: 0 0 10px ${t.color};"></div>
                                        <div class="tema-nombre">${t.nombre}</div>
                                        <div class="tema-preview">${t.preview}</div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="temas-actions">
                                <button class="btn-temas-guardar" id="btn-temas-guardar">GUARDAR</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
            this.modal = document.getElementById('temas-modal');
            this.agregarEventos();
        }

        agregarEventos() {
            this.modal.querySelector('.btn-close-temas').addEventListener('click', () => this.cerrar());
            this.modal.querySelector('.temas-overlay').addEventListener('click', () => this.cerrar());

            this.modal.querySelectorAll('.tema-opcion').forEach(el => {
                el.addEventListener('click', (e) => {
                    this.modal.querySelectorAll('.tema-opcion').forEach(opt => opt.classList.remove('selected'));
                    el.classList.add('selected');
                    this.selectedTheme = el.dataset.tema;
                });
            });

            this.modal.querySelector('.btn-temas-guardar').addEventListener('click', () => this.guardar());
        }

        guardar() {
            aplicarTema(this.selectedTheme);
            localStorage.setItem('zeroflen-theme', this.selectedTheme);
            this.cerrar();
        }

        cerrar() {
            this.modal.classList.remove('visible');
            setTimeout(() => {
                this.modal.remove();
            }, 300);
        }
    }

    // Función para aplicar tema
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
            DOM.btnGaleria.addEventListener('click', () => this.abrirGaleria());
            DOM.btnComunidad.addEventListener('click', () => this.abrirComunidad());
            DOM.btnIdentidad.addEventListener('click', () => this.abrirIdentidad());
            DOM.btnTemas.addEventListener('click', () => this.abrirTemas());
            this.cargarPreview();
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

        async cargarPreview() {
            const proyectos = [
                { id: 1, name: 'Brighter', category: 'Hazbin Hotel', youtubeId: 'eTpEdZoAYbM', cover: 'https://img.youtube.com/vi/eTpEdZoAYbM/0.jpg' },
                { id: 2, name: 'Jester', category: 'The Amazing Digital Circus', youtubeId: 'FxOFYp_ZA8M', cover: 'https://img.youtube.com/vi/FxOFYp_ZA8M/0.jpg' },
                { id: 3, name: 'I Cant Control Myself', category: 'Fnaf', youtubeId: 'YgiopHEUcqI', cover: 'https://img.youtube.com/vi/YgiopHEUcqI/0.jpg' }
            ];
            DOM.menuPreview.innerHTML = proyectos.map(p => `
                <div class="gallery-card preview-card" data-id="${p.id}" data-youtube-id="${p.youtubeId}">
                    <div class="card-image-wrapper">
                        <img src="${p.cover}" alt="${p.name}" class="card-image" loading="lazy">
                        <div class="card-info">
                            <p class="card-title">${p.name}</p>
                            <p class="card-subtitle">${p.category}</p>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        abrirGaleria() {
            const galeria = new GaleriaModal();
            galeria.abrir();
        }

        abrirComunidad() {
            const comunidad = new ComunidadModal();
            comunidad.abrir();
        }

        abrirIdentidad() {
            const identidad = new IdentidadModal();
            identidad.abrir();
        }

        abrirTemas() {
            const temas = new TemasModal();
            temas.abrir();
        }
    }

    function formatTime(seconds) {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
                alert(`ZeroFlen v0.8\nTiempo restante: ${days}\nSaldo: ${budget}`);
            }
        };

        updateCountdown();
        setInterval(updateCountdown, 1000);
        setInterval(updateTimestampBadge, 1000);

        await loadLobbyData();
        rankingManager = new RankingManager();

        // Configurar eventos del Gatekeeper (switch entre login/registro)
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
            DOM.btnLogin.addEventListener('click', loginConClave);
        }
        if (DOM.accessKeyInput) {
            DOM.accessKeyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') loginConClave();
            });
        }

        const stored = localStorage.getItem('observer');
        if (stored) {
            try {
                currentObserver = JSON.parse(stored);
                
                // Si el observador guardado no tiene id (usuarios antiguos), lo obtenemos de Supabase
                if (!currentObserver.id) {
                    console.log('Usuario antiguo sin id, obteniendo de Supabase...');
                    const { data, error } = await supabaseClient
                        .from('observers')
                        .select('id, show_country, access_key')
                        .eq('name', currentObserver.name)
                        .maybeSingle();
                    
                    if (error) {
                        console.error('Error al obtener id del observador:', error);
                    } else if (data) {
                        currentObserver.id = data.id;
                        currentObserver.show_country = data.show_country;
                        currentObserver.access_key = data.access_key;
                        localStorage.setItem('observer', JSON.stringify(currentObserver));
                        console.log('id, show_country y access_key obtenidos y guardados');
                    } else {
                        console.warn('No se encontró el observador en la base de datos');
                        localStorage.removeItem('observer');
                        currentObserver = null;
                        abrirGatekeeper();
                    }
                } else if (currentObserver.show_country === undefined || currentObserver.access_key === undefined) {
                    // Usuario con id pero sin show_country o access_key (versión antigua)
                    const { data, error } = await supabaseClient
                        .from('observers')
                        .select('show_country, access_key')
                        .eq('id', currentObserver.id)
                        .maybeSingle();
                    if (!error && data) {
                        currentObserver.show_country = data.show_country;
                        currentObserver.access_key = data.access_key;
                        localStorage.setItem('observer', JSON.stringify(currentObserver));
                    }
                }

                if (currentObserver) {
                    DOM.gatekeeperModal.classList.remove('active');
                    await rankingManager.cargar_ranking();
                    rankingManager.start_auto_update();
                    await rankingManager.registrar_acceso();
                }
            } catch (e) {
                console.warn('Error al parsear localStorage, limpiando...', e);
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

        const menu = new MenuSidebar(currentObserver);

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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cargar tema guardado
    const savedTheme = localStorage.getItem('zeroflen-theme');
    if (savedTheme) {
        aplicarTema(savedTheme);
    }

    // Elemento oculto para YouTube
    if (!document.getElementById('youtube-player-hidden')) {
        document.body.insertAdjacentHTML('beforeend', '<div id="youtube-player-hidden" style="display: none;"></div>');
    }
})();