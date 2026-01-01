import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Get all assignments
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.*, 
                    h.first_name, h.last_name,
                    s.name as salon_name
             FROM assignments a
             JOIN hairdressers h ON a.hairdresser_id = h.id
             JOIN salons s ON a.salon_id = s.id
             ORDER BY a.start_date DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get active assignments
router.get('/active', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.*, 
                    h.first_name, h.last_name,
                    s.name as salon_name
             FROM assignments a
             JOIN hairdressers h ON a.hairdresser_id = h.id
             JOIN salons s ON a.salon_id = s.id
             WHERE a.end_date IS NULL OR a.end_date >= CURRENT_DATE
             ORDER BY a.start_date DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching active assignments:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get assignments by hairdresser
router.get('/hairdresser/:hairdresserId', async (req, res) => {
    try {
        const { hairdresserId } = req.params;
        const result = await pool.query(
            `SELECT a.*, s.name as salon_name
             FROM assignments a
             JOIN salons s ON a.salon_id = s.id
             WHERE a.hairdresser_id = $1
             ORDER BY a.start_date DESC`,
            [hairdresserId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching hairdresser assignments:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get assignments by salon
router.get('/salon/:salonId', async (req, res) => {
    try {
        const { salonId } = req.params;
        const result = await pool.query(
            `SELECT a.*, h.first_name, h.last_name
             FROM assignments a
             JOIN hairdressers h ON a.hairdresser_id = h.id
             WHERE a.salon_id = $1
             ORDER BY a.start_date DESC`,
            [salonId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching salon assignments:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get assignment by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM assignments WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Affectation non trouvée' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching assignment:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create assignment
router.post('/', async (req, res) => {
    try {
        const { 
            hairdresser_id, 
            salon_id, 
            start_date, 
            end_date, 
            compensation_type, 
            commission_percentage, 
            tax_percentage, 
            fixed_salary 
        } = req.body;
        
        const result = await pool.query(
            `INSERT INTO assignments (
                hairdresser_id, salon_id, start_date, end_date, 
                compensation_type, commission_percentage, tax_percentage, fixed_salary
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *`,
            [
                hairdresser_id, 
                salon_id, 
                start_date, 
                end_date || null, 
                compensation_type || 'commission', 
                commission_percentage || 50, 
                tax_percentage || 0, 
                fixed_salary || 0
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update assignment
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            hairdresser_id, 
            salon_id, 
            start_date, 
            end_date, 
            compensation_type, 
            commission_percentage, 
            tax_percentage, 
            fixed_salary 
        } = req.body;
        
        const result = await pool.query(
            `UPDATE assignments 
             SET hairdresser_id = $1, salon_id = $2, start_date = $3, end_date = $4,
                 compensation_type = $5, commission_percentage = $6, tax_percentage = $7, fixed_salary = $8
             WHERE id = $9 
             RETURNING *`,
            [
                hairdresser_id, 
                salon_id, 
                start_date, 
                end_date || null, 
                compensation_type, 
                commission_percentage, 
                tax_percentage, 
                fixed_salary, 
                id
            ]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Affectation non trouvée' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating assignment:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete assignment
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM assignments WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Affectation non trouvée' });
        }
        res.json({ message: 'Affectation supprimée', assignment: result.rows[0] });
    } catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
