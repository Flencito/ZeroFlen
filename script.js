/**
 * ZeroFlen v0.1 - UI Controller
 * Carga data.json y actualiza el DOM de forma desacoplada.
 * Sin dependencias externas.
 */

(function() {
    // --------------------------------------------------------
    // Configuración
    // --------------------------------------------------------
    const DATA_URL = 'data.json';
    const FETCH_TIMEOUT = 3000; // 3 segundos

    // Datos de respaldo (fallback) en caso de error
    const FALLBACK_DATA = {
        version: '0.1-nucleus',
        days_elapsed: 1,
        financials: {
            initial: 20.00,
            invested: 9.29,
            remaining: 10.71,
            status: 'PROTECTED'
        },
        logs: [
            { timestamp: '2026-02-16 10:00', id: '001', msg: 'Dominio registrado en Namecheap ($6.79)' },
            { timestamp: '2026-02-16 10:05', id: '002', msg: 'Infraestructura v0.1 configurada ($2.50)' },
            { timestamp: '2026-02-16 10:10', id: '003', msg: 'Núcleo Desacoplado implementado' }
        ],
        evolution_state: 'Núcleo estable v0.1 - Todos los sistemas en línea'
    };

    // --------------------------------------------------------
    // Utilidades DOM
    // --------------------------------------------------------
    const DOM = {
        loading: document.getElementById('loading'),
        budget: document.getElementById('budget-value'),
        invested: document.getElementById('invested-value'),
        statusBadge: document.getElementById('status-badge'),
        evolution: document.getElementById('evolution-text'),
        logContainer: document.getElementById('log-container'),
        versionBadge: document.getElementById('version-badge'),
        timestampBadge: document.getElementById('timestamp-badge')
    };

    // Mostrar/ocultar indicador de carga
    function setLoading(visible) {
        if (visible) {
            DOM.loading.classList.add('visible');
        } else {
            DOM.loading.classList.remove('visible');
        }
    }

    // Formatear números como moneda USD
    function formatMoney(value) {
        return '$' + value.toFixed(2);
    }

    // Actualizar la fecha/hora en el badge (formato HH:MM:SS)
    function updateTimestampBadge() {
        const now = new Date();
        const timeStr = now.toTimeString().slice(0, 8); // HH:MM:SS
        DOM.timestampBadge.textContent = timeStr;
    }

    // --------------------------------------------------------
    // Renderizado de datos en el DOM
    // --------------------------------------------------------
    function render(data) {
        // Versión
        if (DOM.versionBadge) {
            DOM.versionBadge.textContent = data.version;
        }

        // Finanzas
        if (DOM.budget) {
            DOM.budget.textContent = formatMoney(data.financials.remaining);
        }
        if (DOM.invested) {
            DOM.invested.textContent = formatMoney(data.financials.invested);
        }
        if (DOM.statusBadge) {
            DOM.statusBadge.textContent = data.financials.status;
        }

        // Evolución
        if (DOM.evolution) {
            DOM.evolution.textContent = data.evolution_state;
        }

        // Logs
        if (DOM.logContainer) {
            // Limpiar contenedor
            DOM.logContainer.innerHTML = '';

            if (data.logs && data.logs.length > 0) {
                data.logs.forEach(log => {
                    const entry = document.createElement('div');
                    entry.className = 'log-entry';

                    const timestamp = document.createElement('span');
                    timestamp.className = 'log-timestamp';
                    timestamp.textContent = log.timestamp;

                    const id = document.createElement('span');
                    id.className = 'log-id';
                    id.textContent = log.id;

                    const msg = document.createElement('span');
                    msg.className = 'log-msg';
                    msg.textContent = log.msg;

                    entry.appendChild(timestamp);
                    entry.appendChild(id);
                    entry.appendChild(msg);
                    DOM.logContainer.appendChild(entry);
                });
            } else {
                // Si no hay logs, mostrar mensaje vacío
                const empty = document.createElement('div');
                empty.className = 'logs-empty';
                empty.textContent = 'Sin eventos registrados';
                DOM.logContainer.appendChild(empty);
            }
        }

        // Actualizar timestamp cada segundo (reloj en vivo)
        updateTimestampBadge();
    }

    // --------------------------------------------------------
    // Carga de datos con fetch + timeout
    // --------------------------------------------------------
    async function loadData() {
        setLoading(true);

        // Controlador de timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        try {
            const response = await fetch(DATA_URL, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            const data = await response.json();
            setLoading(false);
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            console.warn('Error cargando data.json, usando fallback:', error);
            setLoading(false);
            return FALLBACK_DATA; // fallback silencioso
        }
    }

    // --------------------------------------------------------
    // Funciones expuestas para los botones
    // --------------------------------------------------------
    async function recargar_datos() {
        const data = await loadData();
        render(data);
    }

    function mostrar_status() {
        // Lee los valores actuales del DOM y muestra un resumen
        const days = DOM.days?.textContent || '?';
        const budget = DOM.budget?.textContent || '?';
        const status = DOM.statusBadge?.textContent || '?';
        alert(`ZeroFlen v0.1\nDías: ${days}\nSaldo: ${budget}\nEstado: ${status}`);
    }

    // --------------------------------------------------------
// CONTADOR REGRESIVO (expiración del dominio)
// --------------------------------------------------------
const EXPIRATION_DATE = new Date(2027, 1, 16); // 16 de febrero de 2027 (mes 1 = febrero)

function updateCountdown() {
    const now = new Date();
    const diff = EXPIRATION_DATE - now;

    if (diff <= 0) {
        document.getElementById('countdown-value').textContent = '0d 00h 00m 00s';
        return;
    }

    const seconds = Math.floor(diff / 1000) % 60;
    const minutes = Math.floor(diff / (1000 * 60)) % 60;
    const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    const formatted = `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    document.getElementById('countdown-value').textContent = formatted;
}

// Iniciar el contador y actualizar cada segundo
setInterval(updateCountdown, 1000);
updateCountdown(); // llamada inicial

    // --------------------------------------------------------
    // Inicialización
    // --------------------------------------------------------
    async function init() {
        // Exponer las funciones globalmente para los botones onclick
        window.zeroFlenUI = {
            recargar_datos,
            mostrar_status
        };

        // Carga inicial
        const data = await loadData();
        render(data);

        // Actualizar el reloj cada segundo
        setInterval(updateTimestampBadge, 1000);
    }

    // Arrancar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();