const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: 'concurso' }
});

async function run() {
    console.log('Testing connection to Supabase...');

    const tables = ['concursos', 'materias', 'ciclos', 'sessoes', 'progresso_ciclo'];

    for (const table of tables) {
        try {
            const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
            if (error) {
                console.error(`- Table [${table}]: ERROR -`, error.message);
            } else {
                console.log(`- Table [${table}]: OK (${count} rows)`);
            }
        } catch (e) {
            console.error(`- Table [${table}]: CRITICAL ERROR -`, e.message);
        }
    }

    // Testing relationship query
    console.log('Testing relationship query (ciclos -> ciclo_materias)...');
    const { data, error } = await supabase.from('ciclos').select('*, ciclo_materias(materia_id, ordem)').limit(1);
    if (error) {
        console.error('- Relationship query: ERROR -', error.message);
    } else {
        console.log('- Relationship query: OK');
    }
}

run();
