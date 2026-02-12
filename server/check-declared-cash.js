import pool from './database/db.js';

async function checkTable() {
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'declared_cash'
        `);
        
        if (result.rows.length > 0) {
            console.log('✅ Table declared_cash exists');
        } else {
            console.log('❌ Table declared_cash does not exist');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkTable();
