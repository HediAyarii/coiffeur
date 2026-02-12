import pool from './database/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    try {
        console.log('🔄 Application de la migration TVA...');
        
        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, 'database', 'migrations', 'add_vat_to_expenses.sql');
        const migration = fs.readFileSync(migrationPath, 'utf-8');
        
        // Exécuter la migration
        await pool.query(migration);
        
        console.log('✅ Migration TVA appliquée avec succès !');
        console.log('');
        console.log('Nouvelles colonnes ajoutées à la table expenses :');
        console.log('  - amount_ht : Montant HT');
        console.log('  - vat_rate : Taux de TVA (0, 5.5, 10, 20)');
        console.log('  - vat_amount : Montant de la TVA');
        console.log('  - vat_recoverable : TVA récupérable (true/false)');
        console.log('');
        console.log('🎉 Vous pouvez maintenant redémarrer le serveur et le client.');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Erreur lors de la migration:', err.message);
        console.error(err);
        process.exit(1);
    }
}

runMigration();
