import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Get all payments for a salary cost
router.get('/by-salary/:salaryCostId', async (req, res) => {
    try {
        const { salaryCostId } = req.params;
        
        const result = await pool.query(`
            SELECT * FROM salary_payments 
            WHERE salary_cost_id = $1 
            ORDER BY payment_date DESC, created_at DESC
        `, [salaryCostId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get total payments for a salary cost
router.get('/total/:salaryCostId', async (req, res) => {
    try {
        const { salaryCostId } = req.params;
        
        const result = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total_paid
            FROM salary_payments 
            WHERE salary_cost_id = $1
        `, [salaryCostId]);
        
        res.json({ total_paid: parseFloat(result.rows[0].total_paid) || 0 });
    } catch (error) {
        console.error('Error fetching total payments:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get payments summary for multiple salary costs (for listing)
router.post('/totals', async (req, res) => {
    try {
        const { salaryCostIds } = req.body;
        
        if (!salaryCostIds || !Array.isArray(salaryCostIds) || salaryCostIds.length === 0) {
            return res.json({});
        }
        
        const result = await pool.query(`
            SELECT salary_cost_id, COALESCE(SUM(amount), 0) as total_paid
            FROM salary_payments 
            WHERE salary_cost_id = ANY($1)
            GROUP BY salary_cost_id
        `, [salaryCostIds]);
        
        const totals = {};
        result.rows.forEach(row => {
            totals[row.salary_cost_id] = parseFloat(row.total_paid) || 0;
        });
        
        res.json(totals);
    } catch (error) {
        console.error('Error fetching payment totals:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create a new payment
router.post('/', async (req, res) => {
    try {
        const { salary_cost_id, amount, payment_date, payment_method, notes } = req.body;
        
        if (!salary_cost_id || !amount || !payment_date) {
            return res.status(400).json({ error: 'salary_cost_id, amount et payment_date sont requis' });
        }
        
        const result = await pool.query(`
            INSERT INTO salary_payments (salary_cost_id, amount, payment_date, payment_method, notes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [salary_cost_id, amount, payment_date, payment_method || 'virement', notes || null]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update a payment
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, payment_date, payment_method, notes } = req.body;
        
        const result = await pool.query(`
            UPDATE salary_payments 
            SET amount = $1, payment_date = $2, payment_method = $3, notes = $4
            WHERE id = $5
            RETURNING *
        `, [amount, payment_date, payment_method, notes, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Paiement non trouvé' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete a payment
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('DELETE FROM salary_payments WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Paiement non trouvé' });
        }
        
        res.json({ message: 'Paiement supprimé', deleted: result.rows[0] });
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
