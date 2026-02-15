import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Get all equipment purchases with optional filters
router.get('/', async (req, res) => {
    try {
        const { hairdresser_id, month, year } = req.query;
        
        let query = `
            SELECT 
                ep.*,
                h.first_name,
                h.last_name
            FROM hairdresser_equipment_purchases ep
            LEFT JOIN hairdressers h ON ep.hairdresser_id = h.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 0;
        
        if (hairdresser_id) {
            paramCount++;
            query += ` AND ep.hairdresser_id = $${paramCount}`;
            params.push(hairdresser_id);
        }
        
        if (month && year) {
            paramCount++;
            query += ` AND ep.month = $${paramCount}`;
            params.push(month);
            paramCount++;
            query += ` AND ep.year = $${paramCount}`;
            params.push(year);
        }
        
        query += ` ORDER BY ep.purchase_date DESC, ep.created_at DESC`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching equipment purchases:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get equipment purchases for a specific hairdresser
router.get('/hairdresser/:hairdresserId', async (req, res) => {
    try {
        const { hairdresserId } = req.params;
        const { month, year } = req.query;
        
        let query = `
            SELECT *
            FROM hairdresser_equipment_purchases
            WHERE hairdresser_id = $1
        `;
        const params = [hairdresserId];
        
        if (month && year) {
            query += ` AND month = $2 AND year = $3`;
            params.push(month, year);
        }
        
        query += ` ORDER BY purchase_date DESC`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching hairdresser equipment purchases:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get total deductions for a hairdresser for a specific month
router.get('/total/:hairdresserId/:month/:year', async (req, res) => {
    try {
        const { hairdresserId, month, year } = req.params;
        
        const result = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total_deductions
            FROM hairdresser_equipment_purchases
            WHERE hairdresser_id = $1 AND month = $2 AND year = $3
        `, [hairdresserId, month, year]);
        
        res.json({ 
            hairdresser_id: hairdresserId,
            month: parseInt(month),
            year: parseInt(year),
            total_deductions: parseFloat(result.rows[0].total_deductions) || 0
        });
    } catch (error) {
        console.error('Error fetching total deductions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create equipment purchase
router.post('/', async (req, res) => {
    try {
        const { hairdresser_id, description, amount, purchase_date, month, year, notes } = req.body;
        
        // Use provided month/year or extract from purchase_date
        const purchaseMonth = month || new Date(purchase_date).getMonth() + 1;
        const purchaseYear = year || new Date(purchase_date).getFullYear();
        
        const result = await pool.query(
            `INSERT INTO hairdresser_equipment_purchases 
             (hairdresser_id, description, amount, purchase_date, month, year, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [hairdresser_id, description, amount, purchase_date, purchaseMonth, purchaseYear, notes || null]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating equipment purchase:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update equipment purchase
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { description, amount, purchase_date, month, year, notes } = req.body;
        
        const result = await pool.query(
            `UPDATE hairdresser_equipment_purchases 
             SET description = $1, amount = $2, purchase_date = $3, month = $4, year = $5, notes = $6
             WHERE id = $7
             RETURNING *`,
            [description, amount, purchase_date, month, year, notes, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Achat non trouvé' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating equipment purchase:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete equipment purchase
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM hairdresser_equipment_purchases WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Achat non trouvé' });
        }
        
        res.json({ message: 'Achat supprimé' });
    } catch (error) {
        console.error('Error deleting equipment purchase:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
