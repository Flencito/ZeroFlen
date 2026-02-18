/**
 * ZeroFlen v0.2 - Con Supabase (ranking global) + Reproductor persistente
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
        menuPreview: document.getElementById('menu-gallery-preview'),
        menuSidebar: document.querySelector('.menu-sidebar'),

        // Botones móvil
        btnToggleRankingMobile: document.getElementById('btn-toggle-ranking-mobile'),
        btnToggleMenuMobile: document.getElementById('btn-toggle-menu-mobile')
    };

    // --------------------------------------------------------
    // Reproductor global (singleton)
    // --------------------------------------------------------
    const MusicPlayer = (function() {
        let player = null;
        let playlist = [];
        let currentIndex = 0;
        let isPlaying = false;
        let progressInterval = null;
        let youtubePlayer = null;
        let onStateChangeCallbacks = [];

        // Inicializar API de YouTube
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
    // Mini‑reproductor en el menú
    // --------------------------------------------------------
    class MiniPlayer {
        constructor() {
            this.container = null;
            this.createUI();
            this.unsubscribe = MusicPlayer.onStateChange(state => this.updateUI(state));
        }

        createUI() {
            const html = `
                <div id="mini-player" class="mini-player" style="display: none;">
                    <div class="mini-player-info">
                        <span class="mini-player-title" id="mini-player-title">-</span>
                    </div>
                    <div class="mini-player-controls">
                        <button class="mini-btn" id="mini-prev">⏮</button>
                        <button class="mini-btn" id="mini-play-pause">▶</button>
                        <button class="mini-btn" id="mini-next">⏭</button>
                    </div>
                </div>
            `;
            DOM.menuSidebar.insertAdjacentHTML('beforeend', html);
            this.container = document.getElementById('mini-player');
            document.getElementById('mini-prev').addEventListener('click', () => MusicPlayer.prev());
            document.getElementById('mini-play-pause').addEventListener('click', () => MusicPlayer.togglePlayPause());
            document.getElementById('mini-next').addEventListener('click', () => MusicPlayer.next());
        }

        updateUI(state) {
            if (state.current) {
                this.container.style.display = 'flex';
                document.getElementById('mini-player-title').textContent = state.current.name;
                document.getElementById('mini-play-pause').textContent = state.isPlaying ? '⏸' : '▶';
            } else {
                this.container.style.display = 'none';
            }
        }
    }

    // --------------------------------------------------------
    // NameValidator (sin cambios)
    // --------------------------------------------------------
    class NameValidator { /* ... (igual que antes) ... */ }

    // --------------------------------------------------------
    // ColorSelector (sin cambios)
    // --------------------------------------------------------
    class ColorSelector { /* ... (igual que antes) ... */ }

    // --------------------------------------------------------
    // Funciones del Gatekeeper (sin cambios)
    // --------------------------------------------------------
    function validar_completitud() { /* ... */ }
    async function acceder() { /* ... */ }
    function cerrarGatekeeper() { /* ... */ }
    function abrirGatekeeper() { /* ... */ }

    // --------------------------------------------------------
    // RankingManager (sin cambios)
    // --------------------------------------------------------
    class RankingManager { /* ... (igual que antes) ... */ }

    // --------------------------------------------------------
    // Menú Sidebar (ligeramente modificado)
    // --------------------------------------------------------
    class MenuSidebar {
        constructor(observer) {
            this.observer = observer;
            this.actualizarPerfil();
            DOM.btnGaleria.addEventListener('click', () => this.abrirGaleria());
            this.cargarPreview();
            new MiniPlayer(); // Inicializar mini‑reproductor
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
    }

    // --------------------------------------------------------
    // Galería Modal (modificada para usar el reproductor global)
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
                        <!-- Grid de proyectos -->
                        <div class="galeria-grid" id="galeria-content"></div>
                        <!-- Reproductor (oculto inicialmente) -->
                        <div class="reproductor-container" id="reproductor-container" style="display: none;">
                            <div class="disco-container">
                                <img id="disco-imagen" class="disco-rotatorio" src="" alt="cover">
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-bar-neon" id="progress-bar"></div>
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
            // Sincronizar con el estado actual del reproductor
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
            // Efecto glitch
            this.modal.classList.add('glitch');
            setTimeout(() => this.modal.classList.remove('glitch'), 500);

            document.getElementById('galeria-content').style.display = 'none';
            const reproductorContainer = document.getElementById('reproductor-container');
            reproductorContainer.style.display = 'block';

            document.getElementById('disco-imagen').src = proyecto.cover;

            // Configurar controles (usar el reproductor global)
            document.getElementById('play-pause-btn').addEventListener('click', () => MusicPlayer.togglePlayPause());
            document.getElementById('prev-btn').addEventListener('click', () => MusicPlayer.prev());
            document.getElementById('next-btn').addEventListener('click', () => MusicPlayer.next());
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
                // Rotación del disco
                const disco = document.getElementById('disco-imagen');
                if (state.isPlaying) {
                    disco.classList.add('reproduciendo');
                } else {
                    disco.classList.remove('reproduciendo');
                }
            }
        }

        cerrar() {
            this.modal.classList.remove('visible');
            setTimeout(() => {
                this.modal.remove();
            }, 500);
        }
    }

    function formatTime(seconds) {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // --------------------------------------------------------
    // Funciones del lobby (carga data.json) - sin cambios
    // --------------------------------------------------------
    async function loadLobbyData() { /* ... */ }
    function renderLobby(data) { /* ... */ }
    const EXPIRATION_DATE = new Date(2027, 1, 16);
    function updateCountdown() { /* ... */ }
    function updateTimestampBadge() { /* ... */ }

    // --------------------------------------------------------
    // Inicialización
    // --------------------------------------------------------
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
            try {
                currentObserver = JSON.parse(stored);
                DOM.gatekeeperModal.classList.remove('active');
                await rankingManager.cargar_ranking();
                rankingManager.start_auto_update();
                await rankingManager.registrar_acceso();
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

        if (DOM.btnToggleRankingMobile) {
            DOM.btnToggleRankingMobile.addEventListener('click', () => {
                DOM.rankingSidebar.classList.toggle('visible');
            });
        }
        if (DOM.btnToggleMenuMobile) {
            DOM.btnToggleMenuMobile.addEventListener('click', () => {
                document.querySelector('.menu-sidebar').classList.toggle('visible');
            });
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

    // Elemento oculto para el reproductor de YouTube (debe existir en el DOM)
    document.body.insertAdjacentHTML('beforeend', '<div id="youtube-player-hidden" style="display: none;"></div>');
})();