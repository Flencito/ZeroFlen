// database.js
(function() {
    const SUPABASE_URL = 'https://vzfuejudjrztuawlxrpd.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6ZnVlanVkanJ6dHVhd2x4cnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzgyMzMsImV4cCI6MjA4Njk1NDIzM30.DWpOGLkW3aEW7q3flbX0iGf05Nmd_MiZMo0LWbHX5BY';

    const { createClient } = supabase;
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;

    window.db = {
        async getObserverByName(name) {
            const { data, error } = await supabaseClient.from('observers').select('*').eq('name', name).maybeSingle();
            if (error) throw error; return data;
        },
        async getObserverById(id) {
            const { data, error } = await supabaseClient.from('observers').select('*').eq('id', id).maybeSingle();
            if (error) throw error; return data;
        },
        async getObserverByGoogleId(googleId) {
            const { data, error } = await supabaseClient.from('observers').select('*').eq('google_id', googleId).maybeSingle();
            if (error) throw error; return data;
        },
        async insertObserver(observer) {
            const { data, error } = await supabaseClient.from('observers').insert([observer]).select();
            if (error) throw error; return data[0];
        },
        async updateObserver(id, updates) {
            const { error } = await supabaseClient.from('observers').update(updates).eq('id', id);
            if (error) throw error;
        },
        async getRanking() {
            const { data, error } = await supabaseClient.from('observers').select('name, color, country, accesses, show_country').order('accesses', { ascending: false });
            if (error) throw error; return data;
        },
        async getMessages() {
            const { data, error } = await supabaseClient
                .from('messages')
                .select(`id, contenido, created_at, autor_id, observers!inner(name, color, country)`)
                .order('created_at', { ascending: true });
            if (error) throw error; return data;
        },
        async insertMessage(message) {
            const { data, error } = await supabaseClient.from('messages').insert([message]).select();
            if (error) throw error; return data[0];
        },
        async getIpInfo(ip) {
            const { data, error } = await supabaseClient.from('ip_registry').select('*').eq('ip_address', ip).maybeSingle();
            if (error) throw error; return data;
        },
        async upsertIp(ipData) {
            const { error } = await supabaseClient.from('ip_registry').upsert([ipData], { onConflict: 'ip_address' });
            if (error) throw error;
        },
        async validateAccessKey(key) {
            const { data, error } = await supabaseClient.from('access_keys').select('*').eq('key_code', key).eq('is_used', false).maybeSingle();
            if (error) throw error; return data;
        },
        async useAccessKey(id, userId) {
            const { error } = await supabaseClient.from('access_keys').update({ is_used: true, used_by: userId, used_at: new Date() }).eq('id', id);
            if (error) throw error;
        }
    };
})();