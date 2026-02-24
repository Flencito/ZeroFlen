// auth.js
(function() {
    // Dependencias: window.db, window.DOM (se espera que existan cuando se use)

    const TECH_WORDS = ['NEON', 'CORE', 'GHOST', 'VOID', 'ATOM', 'BYTE', 'CYBER', 'DIGITAL', 'ECHO', 'FLUX', 'GRID', 'HACK', 'ION', 'JAVA', 'KERNEL', 'LOOP', 'MATRIX', 'NODE', 'OCTAL', 'PIXEL', 'QUANTUM', 'RADIO', 'SIGNAL', 'TERMINAL', 'ULTRA', 'VECTOR', 'WAVE', 'XENON', 'YOTT', 'ZERO'];

    function generarAccessKey() {
        const word = TECH_WORDS[Math.floor(Math.random() * TECH_WORDS.length)];
        const number = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `${word}${number}`;
    }

    window.generarAccessKeyUnico = async function() {
        let attempts = 0;
        while (attempts < 10) {
            const key = generarAccessKey();
            const { data, error } = await window.supabaseClient
                .from('observers')
                .select('id')
                .eq('access_key', key)
                .maybeSingle();
            if (!error && !data) return key;
            attempts++;
        }
        return `ZERO${Date.now().toString().slice(-4)}`;
    };

    // --------------------------------------------------------
    // Google Auth
    // --------------------------------------------------------
    let googleInitialized = false;

    function initGoogle() {
        if (window.google && window.google.accounts && !googleInitialized) {
            google.accounts.id.initialize({
                client_id: '678193136238-qcernuqkp94rtpakp53g5t8qf3nepp6l.apps.googleusercontent.com',
                callback: window.handleGoogleCredential
            });
            googleInitialized = true;
            console.log('Google Auth inicializado correctamente');
        } else if (!googleInitialized) {
            // Reintentar en 500ms
            setTimeout(initGoogle, 500);
        }
    }

    // Iniciar el proceso de inicialización en cuanto sea posible
    initGoogle();

    window.handleGoogleCredential = async (response) => {
        try {
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            const googleId = payload.sub;
            const email = payload.email;
            const name = payload.name;

            let existingUser = await window.db.getObserverByGoogleId(googleId);
            if (existingUser) {
                localStorage.setItem('observer', JSON.stringify(existingUser));
                window.currentObserver = existingUser;
                window.cerrarGatekeeper();
                location.reload();
            } else {
                window.pendingGoogle = { googleId, email, name };
                if (window.DOM && window.DOM.nameInput) window.DOM.nameInput.value = name;
                const googleBtn = document.querySelector('.google-auth');
                if (googleBtn) googleBtn.style.display = 'none';
                if (window.DOM && window.DOM.registerForm) window.DOM.registerForm.style.display = 'block';
            }
        } catch (e) {
            console.error('Error en Google Auth:', e);
            alert('Error al autenticar con Google');
        }
    };

    // Evento del botón
    const googleBtn = document.getElementById('btn-google-login');
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            if (window.google && window.google.accounts && googleInitialized) {
                google.accounts.id.prompt(); // Muestra el selector de cuentas
            } else {
                alert('Cargando Google API, espera un momento...');
                // Forzar reintento
                initGoogle();
            }
        });
    }

    // --------------------------------------------------------
    // Login con clave
    // --------------------------------------------------------
    window.loginConClave = async function() {
        const clave = document.getElementById('access-key-input')?.value.trim().toUpperCase();
        if (!clave) return;
        try {
            const { data, error } = await window.supabaseClient
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
            window.currentObserver = observer;
            window.cerrarGatekeeper();
            location.reload();
        } catch (e) {
            alert('Error al iniciar sesión');
        }
    };
})();