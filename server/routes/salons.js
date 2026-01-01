import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Get all salons
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM salons ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching salons:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get active salons
router.get('/active', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM salons WHERE is_active = true ORDER BY name"
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching active salons:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get salon by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM salons WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Salon non trouvé' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching salon:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create salon
router.post('/', async (req, res) => {
    try {
        const { name, address, city, phone, email, is_active } = req.body;
        const result = await pool.query(
            `INSERT INTO salons (name, address, city, phone, email, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [name, address || '', city || '', phone || '', email || '', is_active !== false]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating salon:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update salon
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, city, phone, email, is_active } = req.body;
        const result = await pool.query(
            `UPDATE salons 
             SET name = $1, address = $2, city = $3, phone = $4, email = $5, is_active = $6
             WHERE id = $7 
             RETURNING *`,
            [name, address, city, phone, email, is_active, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Salon non trouvé' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating salon:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete salon
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM salons WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Salon non trouvé' });
        }
        res.json({ message: 'Salon supprimé', salon: result.rows[0] });
    } catch (error) {
        console.error('Error deleting salon:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
