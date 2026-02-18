/**
 * ZeroFlen v0.2 - Con Supabase (ranking global) + Menú y Galería + Reproductor YouTube
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

        // Botones móvil
        btnToggleRankingMobile: document.getElementById('btn-toggle-ranking-mobile'),
        btnToggleMenuMobile: document.getElementById('btn-toggle-menu-mobile')
    };

    // --------------------------------------------------------
    // Estado global
    // --------------------------------------------------------
    let currentObserver = null; // { name, color, country }
    let rankingManager = null;
    let nameValidator = null;
    let colorSelector = null;

    // --------------------------------------------------------
    // NameValidator con debounce (consulta Supabase)
    // --------------------------------------------------------
    class NameValidator {
        constructor() {
            this.minLength = 3;
            this.maxLength = 20;
            this.pattern = /^[a-zA-Z0-9_-]{3,20}$/;
            this.debounceTimer = null;
        }

        validar_formato(nombre) {
            if (!nombre || nombre.length < this.minLength) {
                return { valid: false, msg: 'Mínimo 3 caracteres' };
            }
            if (!this.pattern.test(nombre)) {
                return { valid: false, msg: 'Solo letras, números, guiones y guiones bajos' };
            }
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
                return {
                    valid: !exists,
                    msg: exists ? '❌ Nombre ya existe' : '✅ Nombre disponible'
                };
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

        // Geolocalización
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

        try {
            const { data, error } = await supabaseClient
                .from('observers')
                .insert([
                    { name: nombre, color: color, country: country, accesses: 1 }
                ])
                .select();

            if (error) {
                if (error.code === '23505') {
                    alert('Error: el nombre ya existe');
                } else {
                    alert('Error al registrar: ' + error.message);
                }
                return;
            }

            const observer = { name: nombre, color: color, country: country };
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

    function cerrarGatekeeper() {
        DOM.gatekeeperModal.classList.remove('active');
    }

    function abrirGatekeeper() {
        DOM.gatekeeperModal.classList.add('active');
    }

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
                    .select('name, color, country, accesses')
                    .order('accesses', { ascending: false });

                if (error) throw error;

                this.observers = data.map((obs, index) => ({
                    rank: index + 1,
                    ...obs
                }));
                this.render_ranking();
                if (currentObserver) {
                    this.actualizar_observador_actual();
                }
            } catch (error) {
                console.error('Error cargando ranking:', error);
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
            } else {
                DOM.rankingCurrent.innerHTML = `
                    <p class="current-label">TÚ ERES:</p>
                    <p class="current-name breathe" style="color: ${currentObserver.color};">${currentObserver.name}</p>
                    <div class="current-details">
                        <p>Esperando datos...</p>
                    </div>
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
                    const { error: updateError } = await supabaseClient
                        .from('observers')
                        .update({ accesses: newAccesses, last_access: new Date() })
                        .eq('name', currentObserver.name);

                    if (updateError) throw updateError;
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
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
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
    }

    // --------------------------------------------------------
    // Reproductor de YouTube (nuevo)
    // --------------------------------------------------------
    class YouTubePlayer {
        constructor(containerId, videoId, onReady) {
            this.containerId = containerId;
            this.videoId = videoId;
            this.player = null;
            this.onReady = onReady;
            this.loadAPI();
        }

        loadAPI() {
            if (window.YT && window.YT.Player) {
                this.createPlayer();
                return;
            }
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            window.onYouTubeIframeAPIReady = () => this.createPlayer();
        }

        createPlayer() {
            this.player = new YT.Player(this.containerId, {
                height: '0',
                width: '0',
                videoId: this.videoId,
                playerVars: {
                    autoplay: 1,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    modestbranding: 1,
                    playsinline: 1
                },
                events: {
                    onReady: () => this.onReady(this.player),
                    onStateChange: (e) => this.onStateChange(e)
                }
            });
        }

        onStateChange(e) {
            // Puede ser usado para actualizar el botón play/pause
        }

        play() {
            if (this.player) this.player.playVideo();
        }

        pause() {
            if (this.player) this.player.pauseVideo();
        }

        seekTo(seconds) {
            if (this.player) this.player.seekTo(seconds, true);
        }

        getCurrentTime() {
            return this.player ? this.player.getCurrentTime() : 0;
        }

        getDuration() {
            return this.player ? this.player.getDuration() : 0;
        }
    }

    // --------------------------------------------------------
    // Galería Modal (modificada con reproductor)
    // --------------------------------------------------------
    class GaleriaModal {
        constructor() {
            this.modal = null;
            this.player = null;
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
            this.currentPlaylist = this.proyectos.filter(p => p.youtubeId); // Solo los que tienen video
            this.currentIndex = 0;
            this.isPlaying = false;
            this.progressInterval = null;
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
                        <!-- Grid de proyectos (visible por defecto) -->
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
                            <!-- Reproductor oculto de YouTube -->
                            <div id="youtube-player" style="display: none;"></div>
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

            // Ocultar grid y mostrar reproductor
            document.getElementById('galeria-content').style.display = 'none';
            const reproductorContainer = document.getElementById('reproductor-container');
            reproductorContainer.style.display = 'block';

            // Configurar disco
            document.getElementById('disco-imagen').src = proyecto.cover;

            // Encontrar índice en la playlist
            this.currentIndex = this.currentPlaylist.findIndex(p => p.id === proyecto.id);
            this.cargarVideo(proyecto.youtubeId);

            // Configurar controles
            document.getElementById('play-pause-btn').addEventListener('click', () => this.togglePlayPause());
            document.getElementById('prev-btn').addEventListener('click', () => this.reproducirAnterior());
            document.getElementById('next-btn').addEventListener('click', () => this.reproducirSiguiente());
        }

        cargarVideo(youtubeId) {
            if (this.player) {
                this.player.loadVideoById(youtubeId);
            } else {
                this.player = new YouTubePlayer('youtube-player', youtubeId, (player) => {
                    this.player = player;
                    this.iniciarSincronizacion();
                    this.isPlaying = true;
                    document.getElementById('play-pause-btn').innerHTML = '⏸ PAUSE';
                });
            }
        }

        iniciarSincronizacion() {
            if (this.progressInterval) clearInterval(this.progressInterval);
            this.progressInterval = setInterval(() => {
                if (this.player && this.isPlaying) {
                    const current = this.player.getCurrentTime();
                    const duration = this.player.getDuration();
                    const progress = (current / duration) * 100;
                    document.getElementById('progress-bar').style.width = progress + '%';
                    document.getElementById('tiempo-actual').textContent = this.formatTime(current);
                    document.getElementById('tiempo-duracion').textContent = this.formatTime(duration);
                }
            }, 100);
        }

        formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }

        togglePlayPause() {
            if (this.isPlaying) {
                this.player.pause();
                document.getElementById('play-pause-btn').innerHTML = '▶ PLAY';
            } else {
                this.player.play();
                document.getElementById('play-pause-btn').innerHTML = '⏸ PAUSE';
            }
            this.isPlaying = !this.isPlaying;
        }

        reproducirSiguiente() {
            this.currentIndex = (this.currentIndex + 1) % this.currentPlaylist.length;
            const next = this.currentPlaylist[this.currentIndex];
            this.cambiarCancion(next);
        }

        reproducirAnterior() {
            this.currentIndex = (this.currentIndex - 1 + this.currentPlaylist.length) % this.currentPlaylist.length;
            const prev = this.currentPlaylist[this.currentIndex];
            this.cambiarCancion(prev);
        }

        cambiarCancion(proyecto) {
            document.getElementById('disco-imagen').src = proyecto.cover;
            if (this.player) {
                this.player.loadVideoById(proyecto.youtubeId);
                this.isPlaying = true;
                document.getElementById('play-pause-btn').innerHTML = '⏸ PAUSE';
            }
        }

        cerrar() {
            if (this.progressInterval) clearInterval(this.progressInterval);
            this.modal.classList.remove('visible');
            setTimeout(() => {
                this.modal.remove();
            }, 500);
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
})();