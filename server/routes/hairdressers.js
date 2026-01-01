import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Get all hairdressers
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM hairdressers ORDER BY first_name, last_name'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching hairdressers:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get active hairdressers
router.get('/active', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM hairdressers WHERE is_active = true ORDER BY first_name, last_name"
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching active hairdressers:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get hairdresser by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM hairdressers WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Coiffeur non trouvé' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching hairdresser:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create hairdresser
router.post('/', async (req, res) => {
    try {
        const { matricule, first_name, last_name, email, phone, rib_1, rib_2, tax_percentage, is_active } = req.body;
        
        // Create hairdresser
        const result = await pool.query(
            `INSERT INTO hairdressers (matricule, first_name, last_name, email, phone, rib_1, rib_2, tax_percentage, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
             RETURNING *`,
            [matricule || null, first_name, last_name, email || '', phone || '', rib_1 || '', rib_2 || '', tax_percentage || 0, is_active !== false]
        );
        
        const hairdresser = result.rows[0];
        
        // Create user account for hairdresser (email as username, phone as password)
        if (email && phone) {
            await pool.query(
                `INSERT INTO users (username, password_hash, role, name, email, hairdresser_id) 
                 VALUES ($1, $2, 'coiffeur', $3, $4, $5)
                 ON CONFLICT (username) DO NOTHING`,
                [email, phone, `${first_name} ${last_name}`, email, hairdresser.id]
            );
        }
        
        res.status(201).json(hairdresser);
    } catch (error) {
        console.error('Error creating hairdresser:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update hairdresser
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { matricule, first_name, last_name, email, phone, rib_1, rib_2, tax_percentage, is_active } = req.body;
        
        const result = await pool.query(
            `UPDATE hairdressers 
             SET matricule = $1, first_name = $2, last_name = $3, email = $4, phone = $5, rib_1 = $6, rib_2 = $7, tax_percentage = $8, is_active = $9
             WHERE id = $10 
             RETURNING *`,
            [matricule, first_name, last_name, email, phone, rib_1, rib_2, tax_percentage, is_active, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Coiffeur non trouvé' });
        }
        
        // Update user account
        if (email && phone) {
            await pool.query(
                `UPDATE users 
                 SET username = $1, password_hash = $2, name = $3, email = $4
                 WHERE hairdresser_id = $5`,
                [email, phone, `${first_name} ${last_name}`, email, id]
            );
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating hairdresser:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete hairdresser
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Delete user account first
        await pool.query('DELETE FROM users WHERE hairdresser_id = $1', [id]);
        
        const result = await pool.query(
            'DELETE FROM hairdressers WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Coiffeur non trouvé' });
        }
        
        res.json({ message: 'Coiffeur supprimé', hairdresser: result.rows[0] });
    } catch (error) {
        console.error('Error deleting hairdresser:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
