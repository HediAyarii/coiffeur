import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Get all services
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM services ORDER BY name'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get active services
router.get('/active', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM services WHERE is_active = true ORDER BY name'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching active services:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get service by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM services WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Service non trouvé' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching service:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create service
router.post('/', async (req, res) => {
    try {
        const { name, price_salon, price_coiffeur, duration_minutes, is_active } = req.body;
        const result = await pool.query(
            `INSERT INTO services (name, price_salon, price_coiffeur, duration_minutes, is_active) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [name, price_salon || 0, price_coiffeur || 0, duration_minutes || 30, is_active !== false]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update service
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price_salon, price_coiffeur, duration_minutes, is_active } = req.body;
        const result = await pool.query(
            `UPDATE services 
             SET name = $1, price_salon = $2, price_coiffeur = $3, duration_minutes = $4, is_active = $5
             WHERE id = $6 
             RETURNING *`,
            [name, price_salon, price_coiffeur, duration_minutes, is_active, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Service non trouvé' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete service
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM services WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Service non trouvé' });
        }
        res.json({ message: 'Service supprimé', service: result.rows[0] });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
