import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'coiffeur_db',
    user: process.env.DB_USER || 'coiffeur_user',
    password: process.env.DB_PASSWORD || 'coiffeur_pass_2024',
});

async function initDatabase() {
    console.log('🚀 Initialisation de la base de données...');
    console.log(`📍 Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`📍 Database: ${process.env.DB_NAME || 'coiffeur_db'}`);
    console.log(`📍 User: ${process.env.DB_USER || 'coiffeur_user'}`);
    
    try {
        // Test connection
        const client = await pool.connect();
        console.log('✅ Connexion à PostgreSQL réussie');
        
        // Read SQL file
        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        console.log(`📝 Exécution de ${statements.length} instructions SQL...`);
        
        let successCount = 0;
        let skipCount = 0;
        
        for (const statement of statements) {
            try {
                await client.query(statement);
                successCount++;
            } catch (err) {
                // Ignore "already exists" errors
                if (err.code === '42P07' || err.code === '42710' || err.message.includes('already exists')) {
                    skipCount++;
                } else if (err.code === '23505') {
                    // Duplicate key - skip
                    skipCount++;
                } else {
                    console.warn(`⚠️  Erreur (ignorée): ${err.message.split('\n')[0]}`);
                }
            }
        }
        
        console.log(`✅ ${successCount} instructions exécutées`);
        console.log(`⏭️  ${skipCount} instructions ignorées (déjà existantes)`);
        
        // Verify tables
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('\n📋 Tables créées:');
        tablesResult.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        
        client.release();
        
        console.log('\n🎉 Base de données initialisée avec succès!');
        
    } catch (err) {
        console.error('❌ Erreur:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

initDatabase();
