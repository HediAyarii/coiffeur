import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Get all transactions with filters
router.get('/', async (req, res) => {
    try {
        const { salon_id, hairdresser_id, date, start_date, end_date } = req.query;
        
        let query = `
            SELECT sh.*, 
                   h.first_name, h.last_name,
                   s.name as salon_name,
                   sv.name as service_display_name
            FROM service_history sh
            LEFT JOIN hairdressers h ON sh.hairdresser_id = h.id
            LEFT JOIN salons s ON sh.salon_id = s.id
            LEFT JOIN services sv ON sh.service_id = sv.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (salon_id) {
            query += ` AND sh.salon_id = $${paramIndex}`;
            params.push(salon_id);
            paramIndex++;
        }

        if (hairdresser_id) {
            query += ` AND sh.hairdresser_id = $${paramIndex}`;
            params.push(hairdresser_id);
            paramIndex++;
        }

        if (date) {
            query += ` AND DATE(sh.service_date_time) = $${paramIndex}`;
            params.push(date);
            paramIndex++;
        }

        if (start_date && end_date) {
            query += ` AND DATE(sh.service_date_time) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(start_date, end_date);
            paramIndex += 2;
        }

        query += ' ORDER BY sh.service_date_time DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get today's transactions
router.get('/today', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT sh.*, 
                    h.first_name, h.last_name,
                    s.name as salon_name
             FROM service_history sh
             LEFT JOIN hairdressers h ON sh.hairdresser_id = h.id
             LEFT JOIN salons s ON sh.salon_id = s.id
             WHERE DATE(sh.service_date_time) = CURRENT_DATE
             ORDER BY sh.service_date_time DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching today transactions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get this week's transactions
router.get('/week', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT sh.*, 
                    h.first_name, h.last_name,
                    s.name as salon_name
             FROM service_history sh
             LEFT JOIN hairdressers h ON sh.hairdresser_id = h.id
             LEFT JOIN salons s ON sh.salon_id = s.id
             WHERE sh.service_date_time >= date_trunc('week', CURRENT_DATE)
               AND sh.service_date_time < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
             ORDER BY sh.service_date_time DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching week transactions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get this month's transactions
router.get('/month', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT sh.*, 
                    h.first_name, h.last_name,
                    s.name as salon_name
             FROM service_history sh
             LEFT JOIN hairdressers h ON sh.hairdresser_id = h.id
             LEFT JOIN salons s ON sh.salon_id = s.id
             WHERE sh.service_date_time >= date_trunc('month', CURRENT_DATE)
               AND sh.service_date_time < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
             ORDER BY sh.service_date_time DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching month transactions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get transactions by hairdresser
router.get('/hairdresser/:hairdresserId', async (req, res) => {
    try {
        const { hairdresserId } = req.params;
        const { start_date, end_date } = req.query;
        
        let query = `
            SELECT sh.*, s.name as salon_name
            FROM service_history sh
            LEFT JOIN salons s ON sh.salon_id = s.id
            WHERE sh.hairdresser_id = $1
        `;
        const params = [hairdresserId];

        if (start_date && end_date) {
            query += ` AND DATE(sh.service_date_time) BETWEEN $2 AND $3`;
            params.push(start_date, end_date);
        }

        query += ' ORDER BY sh.service_date_time DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching hairdresser transactions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get transaction by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM service_history WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction non trouvée' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create transaction
router.post('/', async (req, res) => {
    try {
        const { 
            service_date_time,
            salon_id, 
            hairdresser_id, 
            service_id, 
            service_name,
            price_salon, 
            price_coiffeur, 
            payment_method 
        } = req.body;
        
        const result = await pool.query(
            `INSERT INTO service_history (
                service_date_time, salon_id, hairdresser_id, service_id, 
                service_name, price_salon, price_coiffeur, payment_method
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *`,
            [
                service_date_time || new Date().toISOString(),
                salon_id,
                hairdresser_id,
                service_id || null,
                service_name || '',
                price_salon || 0,
                price_coiffeur || 0,
                payment_method || 'cash'
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update transaction
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            service_date_time,
            salon_id, 
            hairdresser_id, 
            service_id, 
            service_name,
            price_salon, 
            price_coiffeur, 
            payment_method 
        } = req.body;
        
        const result = await pool.query(
            `UPDATE service_history 
             SET service_date_time = $1, salon_id = $2, hairdresser_id = $3, 
                 service_id = $4, service_name = $5, price_salon = $6, 
                 price_coiffeur = $7, payment_method = $8
             WHERE id = $9 
             RETURNING *`,
            [
                service_date_time, salon_id, hairdresser_id, service_id,
                service_name, price_salon, price_coiffeur, payment_method, id
            ]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction non trouvée' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete transaction
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM service_history WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction non trouvée' });
        }
        res.json({ message: 'Transaction supprimée', transaction: result.rows[0] });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
