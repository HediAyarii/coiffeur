import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Get presence records with filters
router.get('/', async (req, res) => {
    try {
        const { salon_id, date } = req.query;
        
        let query = `
            SELECT p.*, 
                   h.first_name, h.last_name,
                   s.name as salon_name
            FROM presence p
            JOIN hairdressers h ON p.hairdresser_id = h.id
            JOIN salons s ON p.salon_id = s.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (salon_id) {
            query += ` AND p.salon_id = $${paramIndex}`;
            params.push(salon_id);
            paramIndex++;
        }

        if (date) {
            query += ` AND p.date = $${paramIndex}`;
            params.push(date);
            paramIndex++;
        }

        query += ' ORDER BY p.date DESC, h.first_name';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching presence:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get today's presence
router.get('/today', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, 
                    h.first_name, h.last_name,
                    s.name as salon_name
             FROM presence p
             JOIN hairdressers h ON p.hairdresser_id = h.id
             JOIN salons s ON p.salon_id = s.id
             WHERE p.date = CURRENT_DATE
             ORDER BY s.name, h.first_name`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching today presence:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Check if hairdresser is present
router.get('/check', async (req, res) => {
    try {
        const { hairdresser_id, salon_id, date } = req.query;
        
        const result = await pool.query(
            `SELECT * FROM presence 
             WHERE hairdresser_id = $1 AND salon_id = $2 AND date = $3`,
            [hairdresser_id, salon_id, date]
        );
        
        res.json({ isPresent: result.rows.length > 0, record: result.rows[0] || null });
    } catch (error) {
        console.error('Error checking presence:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Toggle presence (create or delete)
router.post('/toggle', async (req, res) => {
    try {
        const { hairdresser_id, salon_id, date } = req.body;
        
        // Check if presence exists
        const existing = await pool.query(
            `SELECT * FROM presence 
             WHERE hairdresser_id = $1 AND salon_id = $2 AND date = $3`,
            [hairdresser_id, salon_id, date]
        );
        
        if (existing.rows.length > 0) {
            // Remove presence
            await pool.query(
                `DELETE FROM presence 
                 WHERE hairdresser_id = $1 AND salon_id = $2 AND date = $3`,
                [hairdresser_id, salon_id, date]
            );
            res.json({ action: 'removed', isPresent: false });
        } else {
            // Add presence
            const result = await pool.query(
                `INSERT INTO presence (hairdresser_id, salon_id, date) 
                 VALUES ($1, $2, $3) 
                 RETURNING *`,
                [hairdresser_id, salon_id, date]
            );
            res.json({ action: 'added', isPresent: true, record: result.rows[0] });
        }
    } catch (error) {
        console.error('Error toggling presence:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create presence record
router.post('/', async (req, res) => {
    try {
        const { hairdresser_id, salon_id, date } = req.body;
        
        const result = await pool.query(
            `INSERT INTO presence (hairdresser_id, salon_id, date) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (hairdresser_id, salon_id, date) DO NOTHING
             RETURNING *`,
            [hairdresser_id, salon_id, date || new Date().toISOString().split('T')[0]]
        );
        
        if (result.rows.length === 0) {
            return res.status(409).json({ error: 'Présence déjà enregistrée' });
        }
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating presence:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete presence record
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM presence WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Présence non trouvée' });
        }
        res.json({ message: 'Présence supprimée', presence: result.rows[0] });
    } catch (error) {
        console.error('Error deleting presence:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
