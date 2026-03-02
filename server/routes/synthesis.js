import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Get synthesis data for a specific date range or month
router.get('/', async (req, res) => {
    try {
        const { month, start_date, end_date } = req.query; // Format: YYYY-MM for month, YYYY-MM-DD for dates
        
        let dateFilter;
        let params;
        let targetDate;
        
        if (start_date && end_date) {
            // Use date range
            dateFilter = `DATE(sh.service_date_time) >= $1 AND DATE(sh.service_date_time) <= $2`;
            params = [start_date, end_date];
            targetDate = end_date;
            
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
                        AND DATE(sh.service_date_time) >= $1 AND DATE(sh.service_date_time) <= $2
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
                        AND DATE(e.date) >= $1 AND DATE(e.date) <= $2
                    LEFT JOIN fixed_expenses fe ON fe.salon_id = s.id AND fe.is_active = true
                    LEFT JOIN LATERAL (
                        SELECT 
                            fea.vat_amount,
                            fea.vat_recoverable
                        FROM fixed_expense_amounts fea
                        WHERE fea.fixed_expense_id = fe.id
                          AND fea.effective_from <= $3
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
            
            const result = await pool.query(query, [start_date, end_date, targetDate]);
            return res.json(result.rows);
        }
        
        // Fallback to month-based query
        targetDate = month ? `${month}-01` : new Date().toISOString().slice(0, 10);
        
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

// Get benefice synthesis for a specific date range or month
router.get('/benefice', async (req, res) => {
    try {
        const { month, start_date, end_date } = req.query;
        
        // Determine if using date range or month
        const useDateRange = start_date && end_date;
        
        // For month-based calculations, extract from start_date or month param
        let year, monthNum, targetDate, filterMonth;
        if (useDateRange) {
            const [sy, sm] = start_date.split('-').map(Number);
            year = sy;
            monthNum = sm;
            targetDate = end_date;
            filterMonth = `${year}-${String(monthNum).padStart(2, '0')}`;
        } else {
            if (!month) {
                return res.status(400).json({ error: 'Month parameter or date range is required' });
            }
            [year, monthNum] = month.split('-').map(Number);
            targetDate = `${month}-01`;
            filterMonth = month;
        }
        
        // 1. Get CA totals (CB and Cash)
        let caResult;
        if (useDateRange) {
            caResult = await pool.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN price_salon ELSE 0 END), 0) as total_cash,
                    COALESCE(SUM(CASE WHEN payment_method = 'card' THEN price_salon ELSE 0 END), 0) as total_cb
                FROM service_history
                WHERE DATE(service_date_time) >= $1 AND DATE(service_date_time) <= $2
            `, [start_date, end_date]);
        } else {
            caResult = await pool.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN price_salon ELSE 0 END), 0) as total_cash,
                    COALESCE(SUM(CASE WHEN payment_method = 'card' THEN price_salon ELSE 0 END), 0) as total_cb
                FROM service_history
                WHERE TO_CHAR(service_date_time, 'YYYY-MM') = $1
            `, [month]);
        }
        
        const totalCash = parseFloat(caResult.rows[0].total_cash) || 0;
        const totalCB = parseFloat(caResult.rows[0].total_cb) || 0;
        
        // 2. Calculate TVA CB (20% included in price)
        const tvaCB = Math.round(totalCB * 0.20 / 1.20 * 100) / 100;
        
        // 3. Get declared cash and TVA on declared (uses month)
        const declaredResult = await pool.query(`
            SELECT 
                COALESCE(SUM(declared_amount), 0) as total_declared,
                COALESCE(SUM(vat_amount), 0) as total_vat_declared
            FROM declared_cash
            WHERE month = $1
        `, [filterMonth]);
        
        const totalDeclared = parseFloat(declaredResult.rows[0].total_declared) || 0;
        const tvaEspeces = parseFloat(declaredResult.rows[0].total_vat_declared) || 0;
        
        // 4. Get total salary payments by virement AND cheque (based on payment_date)
        let virementChequeResult;
        if (useDateRange) {
            virementChequeResult = await pool.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN sp.payment_method = 'virement' THEN sp.amount ELSE 0 END), 0) as total_virement,
                    COALESCE(SUM(CASE WHEN sp.payment_method = 'cheque' THEN sp.amount ELSE 0 END), 0) as total_cheque
                FROM salary_payments sp
                WHERE DATE(sp.payment_date) >= $1 AND DATE(sp.payment_date) <= $2
                  AND sp.payment_method IN ('virement', 'cheque')
            `, [start_date, end_date]);
        } else {
            virementChequeResult = await pool.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN sp.payment_method = 'virement' THEN sp.amount ELSE 0 END), 0) as total_virement,
                    COALESCE(SUM(CASE WHEN sp.payment_method = 'cheque' THEN sp.amount ELSE 0 END), 0) as total_cheque
                FROM salary_payments sp
                WHERE TO_CHAR(sp.payment_date, 'YYYY-MM') = $1
                  AND sp.payment_method IN ('virement', 'cheque')
            `, [filterMonth]);
        }
        
        const totalVirement = parseFloat(virementChequeResult.rows[0].total_virement) || 0;
        const totalCheque = parseFloat(virementChequeResult.rows[0].total_cheque) || 0;
        
        // 4b. Get total salary payments by especes (based on payment_date)
        let especesPaymentResult;
        if (useDateRange) {
            especesPaymentResult = await pool.query(`
                SELECT COALESCE(SUM(sp.amount), 0) as total_especes
                FROM salary_payments sp
                WHERE DATE(sp.payment_date) >= $1 AND DATE(sp.payment_date) <= $2
                  AND sp.payment_method = 'especes'
            `, [start_date, end_date]);
        } else {
            especesPaymentResult = await pool.query(`
                SELECT COALESCE(SUM(sp.amount), 0) as total_especes
                FROM salary_payments sp
                WHERE TO_CHAR(sp.payment_date, 'YYYY-MM') = $1
                  AND sp.payment_method = 'especes'
            `, [filterMonth]);
        }
        
        const totalSalairesEspeces = parseFloat(especesPaymentResult.rows[0].total_especes) || 0;
        
        // 5. Get variable expenses (charges variables)
        let variableExpensesResult;
        if (useDateRange) {
            variableExpensesResult = await pool.query(`
                SELECT COALESCE(SUM(amount), 0) as total
                FROM expenses
                WHERE DATE(date) >= $1 AND DATE(date) <= $2
            `, [start_date, end_date]);
        } else {
            variableExpensesResult = await pool.query(`
                SELECT COALESCE(SUM(amount), 0) as total
                FROM expenses
                WHERE TO_CHAR(date, 'YYYY-MM') = $1
            `, [filterMonth]);
        }
        
        const chargesVariables = parseFloat(variableExpensesResult.rows[0].total) || 0;
        
        // 6. Get fixed expenses (charges fixes) for this month
        const fixedExpensesResult = await pool.query(`
            SELECT COALESCE(SUM(fea.amount), 0) as total
            FROM fixed_expenses fe
            JOIN LATERAL (
                SELECT amount
                FROM fixed_expense_amounts
                WHERE fixed_expense_id = fe.id
                  AND effective_from <= $1
                ORDER BY effective_from DESC
                LIMIT 1
            ) fea ON true
            WHERE fe.is_active = true
        `, [targetDate]);
        
        const chargesFixes = parseFloat(fixedExpensesResult.rows[0].total) || 0;
        
        // 7. Get charges entreprise (based on tax_percentage)
        const chargesEntrepriseResult = await pool.query(`
            SELECT 
                COALESCE(SUM(
                    sc.charges * COALESCE(h.tax_percentage, 0) / 100
                ), 0) as total_charges_entreprise
            FROM salary_costs sc
            LEFT JOIN hairdressers h ON sc.hairdresser_id = h.id
            WHERE sc.month = $1 AND sc.year = $2
        `, [monthNum, year]);
        
        const chargesEntreprise = parseFloat(chargesEntrepriseResult.rows[0].total_charges_entreprise) || 0;
        
        // 8. Get TVA récupérable (from variable and fixed expenses)
        let tvaRecuperableResult;
        if (useDateRange) {
            tvaRecuperableResult = await pool.query(`
                SELECT 
                    COALESCE((
                        SELECT SUM(vat_amount) 
                        FROM expenses 
                        WHERE vat_recoverable = true 
                          AND DATE(date) >= $1 AND DATE(date) <= $2
                    ), 0) +
                    COALESCE((
                        SELECT SUM(fea.vat_amount)
                        FROM fixed_expenses fe
                        JOIN LATERAL (
                            SELECT vat_amount, vat_recoverable
                            FROM fixed_expense_amounts
                            WHERE fixed_expense_id = fe.id
                              AND effective_from <= $2
                            ORDER BY effective_from DESC
                            LIMIT 1
                        ) fea ON true
                        WHERE fe.is_active = true AND fea.vat_recoverable = true
                    ), 0) as total_tva_recuperable
            `, [start_date, end_date]);
        } else {
            tvaRecuperableResult = await pool.query(`
                SELECT 
                    COALESCE((
                        SELECT SUM(vat_amount) 
                        FROM expenses 
                        WHERE vat_recoverable = true 
                          AND TO_CHAR(date, 'YYYY-MM') = $1
                    ), 0) +
                    COALESCE((
                        SELECT SUM(fea.vat_amount)
                        FROM fixed_expenses fe
                        JOIN LATERAL (
                            SELECT vat_amount, vat_recoverable
                            FROM fixed_expense_amounts
                            WHERE fixed_expense_id = fe.id
                              AND effective_from <= $2
                            ORDER BY effective_from DESC
                            LIMIT 1
                        ) fea ON true
                        WHERE fe.is_active = true AND fea.vat_recoverable = true
                    ), 0) as total_tva_recuperable
            `, [filterMonth, targetDate]);
        }
        
        const tvaRecuperable = parseFloat(tvaRecuperableResult.rows[0].total_tva_recuperable) || 0;
        
        // 9. Get product sales by payment method (using HT = total_price - vat_amount)
        let productSalesResult;
        if (useDateRange) {
            productSalesResult = await pool.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN (total_price - COALESCE(vat_amount, 0)) ELSE 0 END), 0) as ventes_produits_especes,
                    COALESCE(SUM(CASE WHEN payment_method = 'card' THEN (total_price - COALESCE(vat_amount, 0)) ELSE 0 END), 0) as ventes_produits_cb
                FROM product_sales
                WHERE DATE(sale_date) >= $1 AND DATE(sale_date) <= $2
                  AND (sale_type = 'sale' OR sale_type IS NULL)
            `, [start_date, end_date]);
        } else {
            productSalesResult = await pool.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN (total_price - COALESCE(vat_amount, 0)) ELSE 0 END), 0) as ventes_produits_especes,
                    COALESCE(SUM(CASE WHEN payment_method = 'card' THEN (total_price - COALESCE(vat_amount, 0)) ELSE 0 END), 0) as ventes_produits_cb
                FROM product_sales
                WHERE TO_CHAR(sale_date, 'YYYY-MM') = $1
                  AND (sale_type = 'sale' OR sale_type IS NULL)
            `, [filterMonth]);
        }
        
        const ventesProduitsEspeces = parseFloat(productSalesResult.rows[0].ventes_produits_especes) || 0;
        const ventesProduitsCB = parseFloat(productSalesResult.rows[0].ventes_produits_cb) || 0;
        
        // 10. Get reste à payer (unpaid salary amounts)
        const resteAPayerResult = await pool.query(`
            SELECT 
                COALESCE(SUM(
                    sc.net_salary 
                    - (sc.charges * (1 - COALESCE(h.tax_percentage, 0) / 100))
                    + COALESCE(rev.total_revenue, 0)
                    - COALESCE(paid.total_paid, 0)
                ), 0) as total_reste_a_payer
            FROM salary_costs sc
            LEFT JOIN hairdressers h ON sc.hairdresser_id = h.id
            LEFT JOIN (
                SELECT hairdresser_id, SUM(price_coiffeur) as total_revenue
                FROM service_history
                WHERE EXTRACT(MONTH FROM service_date_time) = $1
                  AND EXTRACT(YEAR FROM service_date_time) = $2
                GROUP BY hairdresser_id
            ) rev ON sc.hairdresser_id = rev.hairdresser_id
            LEFT JOIN (
                SELECT salary_cost_id, SUM(amount) as total_paid
                FROM salary_payments
                GROUP BY salary_cost_id
            ) paid ON sc.id = paid.salary_cost_id
            WHERE sc.month = $1 AND sc.year = $2
        `, [monthNum, year]);
        
        // 10b. Get equipment purchases total for the month (to subtract from reste a payer)
        const equipmentResult = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total_equipment
            FROM hairdresser_equipment_purchases
            WHERE month = $1 AND year = $2
        `, [monthNum, year]);
        
        const totalEquipment = parseFloat(equipmentResult.rows[0].total_equipment) || 0;
        
        const resteAPayer = Math.max(0, (parseFloat(resteAPayerResult.rows[0].total_reste_a_payer) || 0) - totalEquipment);
        
        // Calculate benefices
        // CB Benefice: Total CB - TVA CB - TVA Espèces - Virement - Chèque - Charges fixes - Charges variables - Charges entreprise + TVA Récupérable + Ventes Produits CB
        const cbBenefice = totalCB - tvaCB - tvaEspeces - totalVirement - totalCheque - chargesFixes - chargesVariables - chargesEntreprise + tvaRecuperable + ventesProduitsCB;
        // Especes Benefice: Total Espèces - Espèces déclaré - Salaires espèces + Ventes Produits Espèces
        const especeBenefice = totalCash - totalDeclared - totalSalairesEspeces + ventesProduitsEspeces;
        
        res.json({
            month,
            // CB data
            total_cb: totalCB,
            tva_cb: tvaCB,
            tva_especes: tvaEspeces,
            total_virement: totalVirement,
            total_cheque: totalCheque,
            charges_fixes: chargesFixes,
            charges_variables: chargesVariables,
            charges_entreprise: chargesEntreprise,
            tva_recuperable: tvaRecuperable,
            ventes_produits_cb: ventesProduitsCB,
            cb_benefice: cbBenefice,
            // Especes data
            total_cash: totalCash,
            total_declared: totalDeclared,
            reste_a_payer: resteAPayer,
            total_salaires_especes: totalSalairesEspeces,
            ventes_produits_especes: ventesProduitsEspeces,
            total_equipment: totalEquipment,
            espece_benefice: especeBenefice
        });
    } catch (error) {
        console.error('Error fetching benefice:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
