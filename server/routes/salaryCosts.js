import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Get all salary costs with optional filters
router.get('/', async (req, res) => {
    try {
        const { month, year } = req.query;
        
        let query = `
            SELECT sc.id, sc.hairdresser_id, sc.last_name, sc.first_name,
                   sc.net_salary, sc.gross_salary, sc.total_cost, sc.charges,
                   sc.month, sc.year, sc.created_at, sc.updated_at,
                   h.first_name as h_first_name, h.last_name as h_last_name, 
                   h.matricule, h.tax_percentage,
                   COALESCE(rev.total_revenue, 0) as generated_revenue,
                   COALESCE(rev.service_count, 0) as service_count
            FROM salary_costs sc
            LEFT JOIN hairdressers h ON sc.hairdresser_id = h.id
            LEFT JOIN (
                SELECT 
                    hairdresser_id,
                    SUM(price_coiffeur) as total_revenue,
                    COUNT(*) as service_count
                FROM service_history
                WHERE EXTRACT(MONTH FROM service_date_time) = $1
                  AND EXTRACT(YEAR FROM service_date_time) = $2
                GROUP BY hairdresser_id
            ) rev ON sc.hairdresser_id = rev.hairdresser_id
            WHERE sc.month = $1 AND sc.year = $2
            ORDER BY sc.last_name ASC
        `;
        
        const params = [parseInt(month) || new Date().getMonth() + 1, parseInt(year) || new Date().getFullYear()];

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching salary costs:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get available months
router.get('/months', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT year, month 
            FROM salary_costs 
            ORDER BY year DESC, month DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching months:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get summary for a specific month
router.get('/summary', async (req, res) => {
    try {
        const { month, year } = req.query;
        
        if (!month || !year) {
            return res.status(400).json({ error: 'Month and year are required' });
        }

        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_employees,
                SUM(net_salary) as total_net,
                SUM(gross_salary) as total_gross,
                SUM(total_cost) as total_cost,
                SUM(charges) as total_charges
            FROM salary_costs
            WHERE month = $1 AND year = $2
        `, [parseInt(month), parseInt(year)]);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Import CSV data (bulk insert)
router.post('/import', async (req, res) => {
    const client = await pool.connect();
    try {
        const { month, year, data } = req.body;

        if (!month || !year || !data || !Array.isArray(data)) {
            return res.status(400).json({ error: 'Month, year and data array are required' });
        }

        await client.query('BEGIN');

        // Delete existing data for this month/year
        await client.query(
            'DELETE FROM salary_costs WHERE month = $1 AND year = $2',
            [parseInt(month), parseInt(year)]
        );

        let imported = 0;
        let errors = [];

        for (const row of data) {
            try {
                // Try to find the hairdresser by last_name and first_name
                const hairdresserResult = await client.query(`
                    SELECT id FROM hairdressers 
                    WHERE LOWER(last_name) = LOWER($1) 
                    AND (
                        LOWER(first_name) = LOWER($2)
                        OR LOWER(first_name) LIKE LOWER($2) || '%'
                        OR $2 LIKE LOWER(first_name) || '%'
                    )
                    LIMIT 1
                `, [row.last_name.trim(), row.first_name.split(',')[0].trim()]);

                const hairdresserId = hairdresserResult.rows.length > 0 
                    ? hairdresserResult.rows[0].id 
                    : null;

                await client.query(`
                    INSERT INTO salary_costs (
                        hairdresser_id, last_name, first_name, 
                        net_salary, gross_salary, total_cost, charges,
                        month, year
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    hairdresserId,
                    row.last_name.trim(),
                    row.first_name.trim(),
                    parseFloat(row.net_salary) || 0,
                    parseFloat(row.gross_salary) || 0,
                    parseFloat(row.total_cost) || 0,
                    parseFloat(row.charges) || 0,
                    parseInt(month),
                    parseInt(year)
                ]);

                imported++;
            } catch (err) {
                errors.push({ row, error: err.message });
            }
        }

        await client.query('COMMIT');

        res.json({ 
            success: true, 
            imported, 
            errors: errors.length > 0 ? errors : undefined,
            message: `${imported} lignes importées avec succès`
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error importing salary costs:', error);
        res.status(500).json({ error: 'Erreur lors de l\'import' });
    } finally {
        client.release();
    }
});

// Delete all data for a specific month
router.delete('/month/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;
        
        const result = await pool.query(
            'DELETE FROM salary_costs WHERE year = $1 AND month = $2 RETURNING *',
            [parseInt(year), parseInt(month)]
        );

        res.json({ 
            success: true, 
            deleted: result.rowCount,
            message: `${result.rowCount} lignes supprimées`
        });
    } catch (error) {
        console.error('Error deleting salary costs:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get single salary cost by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT sc.*, h.first_name as h_first_name, h.last_name as h_last_name
            FROM salary_costs sc
            LEFT JOIN hairdressers h ON sc.hairdresser_id = h.id
            WHERE sc.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Coût salaire non trouvé' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching salary cost:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update a salary cost
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { net_salary, gross_salary, total_cost, charges, hairdresser_id } = req.body;

        const result = await pool.query(`
            UPDATE salary_costs 
            SET net_salary = $1, gross_salary = $2, total_cost = $3, 
                charges = $4, hairdresser_id = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `, [net_salary, gross_salary, total_cost, charges, hairdresser_id, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Coût salaire non trouvé' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating salary cost:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete single salary cost
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM salary_costs WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Coût salaire non trouvé' });
        }

        res.json({ success: true, message: 'Supprimé avec succès' });
    } catch (error) {
        console.error('Error deleting salary cost:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
