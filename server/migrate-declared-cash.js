import pool from './database/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
    try {
        console.log('📋 Reading migration file...');
        const migrationPath = path.join(__dirname, 'database', 'migrations', 'add_declared_cash.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('🚀 Applying migration: add_declared_cash.sql');
        await pool.query(sql);

        console.log('✅ Migration applied successfully!');
        
        // Verify the table was created
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'declared_cash'
        `);
        
        if (result.rows.length > 0) {
            console.log('✅ Table declared_cash created successfully');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error applying migration:', error.message);
        process.exit(1);
    }
}

applyMigration();
