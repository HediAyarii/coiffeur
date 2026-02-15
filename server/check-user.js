import pool from './database/db.js';

async function fixUser() {
    try {
        // Update the user with COIF-14 username to use ali@coiffeurpro.com
        const result = await pool.query(
            `UPDATE users 
             SET username = $1, email = $1
             WHERE username = 'COIF-14'
             RETURNING *`,
            ['ali@coiffeurpro.com']
        );
        console.log('Updated user:', JSON.stringify(result.rows[0], null, 2));
        console.log('\nMaintenant connectez-vous avec:');
        console.log('Identifiant: ali@coiffeurpro.com');
        console.log('Mot de passe: COIF-14');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixUser();
