import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Get all fixed expenses with their current amounts for a specific month
router.get('/', async (req, res) => {
    try {
        const { salon_id, month } = req.query;
        // month format: YYYY-MM
        const targetDate = month ? `${month}-01` : new Date().toISOString().slice(0, 10);
        
        let query = `
            SELECT 
                fe.id,
                fe.salon_id,
                fe.category,
                fe.name,
                fe.description,
                fe.is_active,
                fe.created_at,
                s.name as salon_name,
                COALESCE(
                    (SELECT fea.amount 
                     FROM fixed_expense_amounts fea 
                     WHERE fea.fixed_expense_id = fe.id 
                       AND fea.effective_from <= $1
                     ORDER BY fea.effective_from DESC 
                     LIMIT 1
                    ), 0
                ) as amount,
                (SELECT fea.effective_from 
                 FROM fixed_expense_amounts fea 
                 WHERE fea.fixed_expense_id = fe.id 
                   AND fea.effective_from <= $1
                 ORDER BY fea.effective_from DESC 
                 LIMIT 1
                ) as amount_effective_from
            FROM fixed_expenses fe
            LEFT JOIN salons s ON fe.salon_id = s.id
            WHERE fe.is_active = true
        `;
        
        const params = [targetDate];
        let paramIndex = 2;

        if (salon_id) {
            query += ` AND fe.salon_id = $${paramIndex}`;
            params.push(salon_id);
            paramIndex++;
        }

        query += ' ORDER BY fe.category, fe.name';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching fixed expenses:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get fixed expense by ID with all amount history
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const expenseResult = await pool.query(
            `SELECT fe.*, s.name as salon_name
             FROM fixed_expenses fe
             LEFT JOIN salons s ON fe.salon_id = s.id
             WHERE fe.id = $1`,
            [id]
        );
        
        if (expenseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Dépense fixe non trouvée' });
        }

        const amountsResult = await pool.query(
            `SELECT * FROM fixed_expense_amounts 
             WHERE fixed_expense_id = $1 
             ORDER BY effective_from DESC`,
            [id]
        );

        res.json({
            ...expenseResult.rows[0],
            amounts: amountsResult.rows
        });
    } catch (error) {
        console.error('Error fetching fixed expense:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get amount history for a fixed expense
router.get('/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            `SELECT * FROM fixed_expense_amounts 
             WHERE fixed_expense_id = $1 
             ORDER BY effective_from DESC`,
            [id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching amount history:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create fixed expense with initial amount
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const { salon_id, category, name, description, amount, effective_from } = req.body;
        
        await client.query('BEGIN');

        // Create the fixed expense
        const expenseResult = await client.query(
            `INSERT INTO fixed_expenses (salon_id, category, name, description) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [salon_id, category || 'other', name, description || '']
        );
        
        const fixedExpense = expenseResult.rows[0];

        // Create the initial amount
        const effectiveDate = effective_from || new Date().toISOString().slice(0, 10);
        await client.query(
            `INSERT INTO fixed_expense_amounts (fixed_expense_id, amount, effective_from) 
             VALUES ($1, $2, $3)`,
            [fixedExpense.id, amount || 0, effectiveDate]
        );

        await client.query('COMMIT');

        res.status(201).json({
            ...fixedExpense,
            amount: amount || 0,
            amount_effective_from: effectiveDate
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating fixed expense:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        client.release();
    }
});

// Update fixed expense info (not the amount)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { salon_id, category, name, description, is_active } = req.body;
        
        const result = await pool.query(
            `UPDATE fixed_expenses 
             SET salon_id = $1, category = $2, name = $3, description = $4, is_active = $5
             WHERE id = $6 
             RETURNING *`,
            [salon_id, category, name, description, is_active, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dépense fixe non trouvée' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating fixed expense:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update/Set amount for a fixed expense starting from a specific month
// This creates a new amount record effective from the given date
router.post('/:id/amount', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, effective_from } = req.body;
        
        // Check if fixed expense exists
        const checkResult = await pool.query(
            'SELECT id FROM fixed_expenses WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Dépense fixe non trouvée' });
        }

        // Check if there's already an amount for this exact date
        const existingResult = await pool.query(
            `SELECT id FROM fixed_expense_amounts 
             WHERE fixed_expense_id = $1 AND effective_from = $2`,
            [id, effective_from]
        );

        if (existingResult.rows.length > 0) {
            // Update existing
            await pool.query(
                `UPDATE fixed_expense_amounts 
                 SET amount = $1 
                 WHERE fixed_expense_id = $2 AND effective_from = $3`,
                [amount, id, effective_from]
            );
        } else {
            // Insert new amount version
            await pool.query(
                `INSERT INTO fixed_expense_amounts (fixed_expense_id, amount, effective_from) 
                 VALUES ($1, $2, $3)`,
                [id, amount, effective_from]
            );
        }

        res.json({ message: 'Montant mis à jour', amount, effective_from });
    } catch (error) {
        console.error('Error updating amount:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete a fixed expense (soft delete - just deactivate)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            `UPDATE fixed_expenses SET is_active = false WHERE id = $1 RETURNING *`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dépense fixe non trouvée' });
        }
        res.json({ message: 'Dépense fixe supprimée', expense: result.rows[0] });
    } catch (error) {
        console.error('Error deleting fixed expense:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get total fixed expenses for a specific month
router.get('/total/:month', async (req, res) => {
    try {
        const { month } = req.params;
        const { salon_id } = req.query;
        const targetDate = `${month}-01`;
        
        let query = `
            SELECT 
                COALESCE(SUM(
                    (SELECT fea.amount 
                     FROM fixed_expense_amounts fea 
                     WHERE fea.fixed_expense_id = fe.id 
                       AND fea.effective_from <= $1
                     ORDER BY fea.effective_from DESC 
                     LIMIT 1
                    )
                ), 0) as total
            FROM fixed_expenses fe
            WHERE fe.is_active = true
        `;
        
        const params = [targetDate];
        
        if (salon_id) {
            query += ` AND fe.salon_id = $2`;
            params.push(salon_id);
        }

        const result = await pool.query(query, params);
        res.json({ total: parseFloat(result.rows[0].total) || 0 });
    } catch (error) {
        console.error('Error fetching total:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
