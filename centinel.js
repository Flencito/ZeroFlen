// centinel.js
(function() {
    const PROHIBIDAS = ['puto', 'puta', 'mierda', 'idiota', 'tonto', 'cabrón', 'coño', 'verga', 'hp', 'malparido', 'gonorrea'];

    function escanearMensaje(texto) {
        const lower = texto.toLowerCase();
        for (let palabra of PROHIBIDAS) {
            if (lower.includes(palabra)) return true;
        }
        return false;
    }

    window.centinel = {
        escanearMensaje,
        async procesarInfraccion(autorId, mensaje) {
            try {
                const autor = await window.db.getObserverById(autorId);
                if (!autor) return;
                const nuevasInfracciones = (autor.infraction_count || 0) + 1;
                await window.db.updateObserver(autorId, { infraction_count: nuevasInfracciones });
                if (nuevasInfracciones >= 5) {
                    await window.db.updateObserver(autorId, { is_banned: true });
                } else if (nuevasInfracciones >= 3) {
                    const muteUntil = new Date(Date.now() + 30 * 60 * 1000);
                    await window.db.updateObserver(autorId, { mute_until: muteUntil.toISOString() });
                }
                console.log(`Infracción #${nuevasInfracciones} para ${autor.name}`);
            } catch (e) {
                console.error('Error en centinel:', e);
            }
        },
        async estaMuteado(autorId) {
            const autor = await window.db.getObserverById(autorId);
            if (!autor) return false;
            return (autor.mute_until && new Date(autor.mute_until) > new Date()) || false;
        },
        async estaBaneado(autorId) {
            const autor = await window.db.getObserverById(autorId);
            return autor?.is_banned || false;
        }
    };
})();