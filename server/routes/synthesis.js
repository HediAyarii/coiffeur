import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Get synthesis data for a specific month
router.get('/', async (req, res) => {
    try {
        const { month } = req.query; // Format: YYYY-MM
        const targetDate = month ? `${month}-01` : new Date().toISOString().slice(0, 10);
        
        const query = `
            WITH salon_revenue AS (
                SELECT 
                    s.id as salon_id,
                    s.name as salon_name,
                    -- CA Espèces
                    COALESCE(SUM(CASE WHEN sh.payment_method = 'cash' THEN sh.price_salon ELSE 0 END), 0) as ca_cash,
                    -- CA CB
                    COALESCE(SUM(CASE WHEN sh.payment_method = 'card' THEN sh.price_salon ELSE 0 END), 0) as ca_card,
                    -- CA Général
                    COALESCE(SUM(sh.price_salon), 0) as ca_total
                FROM salons s
                LEFT JOIN service_history sh ON sh.salon_id = s.id 
                    AND TO_CHAR(sh.service_date_time, 'YYYY-MM') = $1
                WHERE s.is_active = true
                GROUP BY s.id, s.name
            ),
            vat_recoverable AS (
                SELECT 
                    s.id as salon_id,
                    -- TVA récupérable sur charges variables
                    COALESCE(SUM(CASE WHEN e.vat_recoverable = true THEN e.vat_amount ELSE 0 END), 0) as variable_vat,
                    -- TVA récupérable sur charges fixes
                    COALESCE(SUM(
                        CASE 
                            WHEN fea.vat_recoverable = true THEN fea.vat_amount 
                            ELSE 0 
                        END
                    ), 0) as fixed_vat
                FROM salons s
                LEFT JOIN expenses e ON e.salon_id = s.id 
                    AND TO_CHAR(e.date, 'YYYY-MM') = $1
                LEFT JOIN fixed_expenses fe ON fe.salon_id = s.id AND fe.is_active = true
                LEFT JOIN LATERAL (
                    SELECT 
                        fea.vat_amount,
                        fea.vat_recoverable
                    FROM fixed_expense_amounts fea
                    WHERE fea.fixed_expense_id = fe.id
                      AND fea.effective_from <= $2
                    ORDER BY fea.effective_from DESC
                    LIMIT 1
                ) fea ON true
                WHERE s.is_active = true
                GROUP BY s.id
            )
            SELECT 
                sr.salon_id,
                sr.salon_name,
                sr.ca_cash,
                sr.ca_card,
                sr.ca_total,
                -- TVA sur CA CB (20%)
                ROUND(sr.ca_card * 0.20 / 1.20, 2) as vat_on_card,
                -- TVA récupérable totale
                COALESCE(vr.variable_vat + vr.fixed_vat, 0) as vat_recoverable
            FROM salon_revenue sr
            LEFT JOIN vat_recoverable vr ON vr.salon_id = sr.salon_id
            ORDER BY sr.salon_name
        `;
        
        const result = await pool.query(query, [month || new Date().toISOString().slice(0, 7), targetDate]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching synthesis:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get or create declared cash for a salon/month
router.get('/declared-cash/:salonId/:month', async (req, res) => {
    try {
        const { salonId, month } = req.params;
        
        const result = await pool.query(
            `SELECT * FROM declared_cash 
             WHERE salon_id = $1 AND month = $2`,
            [salonId, month]
        );
        
        if (result.rows.length === 0) {
            return res.json({ salon_id: salonId, month, declared_amount: 0, vat_amount: 0 });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching declared cash:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update declared cash for a salon/month
router.post('/declared-cash', async (req, res) => {
    try {
        const { salon_id, month, declared_amount } = req.body;
        
        // Calculate VAT (20%)
        const vat_amount = Math.round(declared_amount * 0.20 / 1.20 * 100) / 100;
        
        const result = await pool.query(
            `INSERT INTO declared_cash (salon_id, month, declared_amount, vat_amount)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (salon_id, month)
             DO UPDATE SET declared_amount = $3, vat_amount = $4, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [salon_id, month, declared_amount, vat_amount]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating declared cash:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
