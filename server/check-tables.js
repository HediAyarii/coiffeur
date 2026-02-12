import pool from './database/db.js';

async function checkTables() {
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('Tables existantes:');
        result.rows.forEach(row => console.log('  -', row.table_name));
        
        process.exit(0);
    } catch (error) {
        console.error('Erreur:', error);
        process.exit(1);
    }
}

checkTables();
