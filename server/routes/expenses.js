import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Get all expenses with filters
router.get('/', async (req, res) => {
    try {
        const { salon_id, month, category, type } = req.query;
        
        let query = `
            SELECT e.*, s.name as salon_name
            FROM expenses e
            LEFT JOIN salons s ON e.salon_id = s.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (salon_id) {
            query += ` AND e.salon_id = $${paramIndex}`;
            params.push(salon_id);
            paramIndex++;
        }

        if (month) {
            query += ` AND TO_CHAR(e.date, 'YYYY-MM') = $${paramIndex}`;
            params.push(month);
            paramIndex++;
        }

        if (category) {
            query += ` AND e.category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        if (type) {
            query += ` AND e.type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        query += ' ORDER BY e.date DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get this month's expenses
router.get('/month', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT e.*, s.name as salon_name
             FROM expenses e
             LEFT JOIN salons s ON e.salon_id = s.id
             WHERE e.date >= date_trunc('month', CURRENT_DATE)
               AND e.date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
             ORDER BY e.date DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching month expenses:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get expenses by salon
router.get('/salon/:salonId', async (req, res) => {
    try {
        const { salonId } = req.params;
        const result = await pool.query(
            `SELECT * FROM expenses 
             WHERE salon_id = $1 
             ORDER BY date DESC`,
            [salonId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching salon expenses:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get expense categories
router.get('/categories', async (req, res) => {
    res.json([
        { value: 'rent', label: 'Loyer' },
        { value: 'utilities', label: 'Charges (eau, électricité)' },
        { value: 'supplies', label: 'Fournitures' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'equipment', label: 'Équipement' },
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'insurance', label: 'Assurance' },
        { value: 'taxes', label: 'Taxes' },
        { value: 'payroll', label: 'Charges salariales' },
        { value: 'other', label: 'Autre' }
    ]);
});

// Get expense by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM expenses WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dépense non trouvée' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching expense:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create expense
router.post('/', async (req, res) => {
    try {
        const { salon_id, type, category, amount, date, description } = req.body;
        
        const result = await pool.query(
            `INSERT INTO expenses (salon_id, type, category, amount, date, description) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [
                salon_id,
                type || 'variable',
                category || 'other',
                amount || 0,
                date || new Date().toISOString().split('T')[0],
                description || ''
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update expense
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { salon_id, type, category, amount, date, description } = req.body;
        
        const result = await pool.query(
            `UPDATE expenses 
             SET salon_id = $1, type = $2, category = $3, amount = $4, date = $5, description = $6
             WHERE id = $7 
             RETURNING *`,
            [salon_id, type, category, amount, date, description, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dépense non trouvée' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete expense
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM expenses WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dépense non trouvée' });
        }
        res.json({ message: 'Dépense supprimée', expense: result.rows[0] });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
