// admin.js
(function() {
    const ADMIN_IDS = [1]; // ID del director
    if (!window.currentObserver || !ADMIN_IDS.includes(window.currentObserver.id)) return;

    // Evitar múltiples paneles
    if (document.getElementById('admin-panel')) return;

    const adminPanel = document.createElement('div');
    adminPanel.id = 'admin-panel';
    adminPanel.innerHTML = `
        <div class="admin-header">
            <h3>👁️ PANEL CENTINELA</h3>
            <button id="admin-close">✕</button>
        </div>
        <div class="admin-content">
            <p>IPs sospechosas: <span id="ips-count">0</span></p>
            <button id="admin-generar-salvoconducto">🎟️ GENERAR SALVOCONDUCTO</button>
            <div id="salvoconducto-result"></div>
            <h4>Últimas infracciones:</h4>
            <ul id="infracciones-lista"></ul>
        </div>
    `;
    document.body.appendChild(adminPanel);

    // Estilos ya deberían estar en admin.css, pero añadimos por si acaso
    const style = document.createElement('style');
    style.textContent = `
        #admin-panel { position: fixed; top: 20px; right: 20px; width: 300px; background: var(--bg-darker); border: 2px solid var(--accent-color); border-radius: 8px; padding: 15px; z-index: 10000; font-family: var(--font-mono); box-shadow: 0 0 30px var(--shadow-color); }
        #admin-panel .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        #admin-panel h3 { color: var(--accent-color); margin: 0; }
        #admin-panel button { background: rgba(var(--accent-color-rgb), 0.1); border: 1px solid var(--accent-color); color: var(--accent-color); padding: 5px 10px; cursor: pointer; }
    `;
    document.head.appendChild(style);

    document.getElementById('admin-generar-salvoconducto').addEventListener('click', async () => {
        const code = 'SAVE-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        const { error } = await window.supabaseClient.from('access_keys').insert([{ key_code: code, created_by: window.currentObserver.id }]);
        if (error) alert('Error al generar código');
        else document.getElementById('salvoconducto-result').innerHTML = `Código: <strong>${code}</strong> (válido 1 uso)`;
    });

    document.getElementById('admin-close').addEventListener('click', () => adminPanel.remove());
})();