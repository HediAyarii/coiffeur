import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
    try {
        // Today's stats
        const todayRevenue = await pool.query(
            `SELECT COALESCE(SUM(price_salon), 0) as total 
             FROM service_history 
             WHERE DATE(service_date_time) = CURRENT_DATE`
        );

        const todayServices = await pool.query(
            `SELECT COUNT(*) as count 
             FROM service_history 
             WHERE DATE(service_date_time) = CURRENT_DATE`
        );

        // This week
        const weekRevenue = await pool.query(
            `SELECT COALESCE(SUM(price_salon), 0) as total 
             FROM service_history 
             WHERE service_date_time >= date_trunc('week', CURRENT_DATE)
               AND service_date_time < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'`
        );

        // This month
        const monthRevenue = await pool.query(
            `SELECT COALESCE(SUM(price_salon), 0) as total 
             FROM service_history 
             WHERE service_date_time >= date_trunc('month', CURRENT_DATE)
               AND service_date_time < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'`
        );

        // Active counts
        const activeSalons = await pool.query(
            `SELECT COUNT(*) as count FROM salons WHERE is_active = true`
        );

        const activeHairdressers = await pool.query(
            `SELECT COUNT(*) as count FROM hairdressers WHERE is_active = true`
        );

        res.json({
            todayRevenue: parseFloat(todayRevenue.rows[0].total),
            todayServices: parseInt(todayServices.rows[0].count),
            weekRevenue: parseFloat(weekRevenue.rows[0].total),
            monthRevenue: parseFloat(monthRevenue.rows[0].total),
            activeSalons: parseInt(activeSalons.rows[0].count),
            activeHairdressers: parseInt(activeHairdressers.rows[0].count)
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get daily revenue for chart (last N days)
router.get('/daily-revenue', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        
        const result = await pool.query(
            `SELECT 
                DATE(service_date_time) as date,
                TO_CHAR(service_date_time, 'Dy DD') as label,
                COALESCE(SUM(price_salon), 0) as revenue,
                COUNT(*) as count
             FROM service_history
             WHERE service_date_time >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
             GROUP BY DATE(service_date_time), TO_CHAR(service_date_time, 'Dy DD')
             ORDER BY DATE(service_date_time)`
        );

        // Fill in missing days
        const filledData = [];
        for (let i = parseInt(days) - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const label = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
            
            const existing = result.rows.find(r => r.date.toISOString().split('T')[0] === dateStr);
            filledData.push({
                date: dateStr,
                label,
                revenue: existing ? parseFloat(existing.revenue) : 0,
                count: existing ? parseInt(existing.count) : 0
            });
        }

        res.json(filledData);
    } catch (error) {
        console.error('Error fetching daily revenue:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get revenue by salon
router.get('/revenue-by-salon', async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        
        let dateFilter = '';
        if (period === 'week') {
            dateFilter = `AND service_date_time >= date_trunc('week', CURRENT_DATE)`;
        } else if (period === 'month') {
            dateFilter = `AND service_date_time >= date_trunc('month', CURRENT_DATE)`;
        } else if (period === 'year') {
            dateFilter = `AND service_date_time >= date_trunc('year', CURRENT_DATE)`;
        }

        const result = await pool.query(
            `SELECT 
                s.id,
                s.name,
                COALESCE(SUM(sh.price_salon), 0) as revenue,
                COUNT(sh.id) as count
             FROM salons s
             LEFT JOIN service_history sh ON s.id = sh.salon_id ${dateFilter}
             WHERE s.is_active = true
             GROUP BY s.id, s.name
             ORDER BY revenue DESC`
        );

        res.json(result.rows.map(r => ({
            ...r,
            revenue: parseFloat(r.revenue),
            count: parseInt(r.count)
        })));
    } catch (error) {
        console.error('Error fetching revenue by salon:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get top hairdressers
router.get('/top-hairdressers', async (req, res) => {
    try {
        const { limit = 5, period = 'month' } = req.query;
        
        let dateFilter = '';
        if (period === 'week') {
            dateFilter = `AND service_date_time >= date_trunc('week', CURRENT_DATE)`;
        } else if (period === 'month') {
            dateFilter = `AND service_date_time >= date_trunc('month', CURRENT_DATE)`;
        } else if (period === 'year') {
            dateFilter = `AND service_date_time >= date_trunc('year', CURRENT_DATE)`;
        }

        const result = await pool.query(
            `SELECT 
                h.id,
                h.first_name,
                h.last_name,
                COALESCE(SUM(sh.price_salon), 0) as revenue,
                COUNT(sh.id) as count
             FROM hairdressers h
             LEFT JOIN service_history sh ON h.id = sh.hairdresser_id ${dateFilter}
             WHERE h.is_active = true
             GROUP BY h.id, h.first_name, h.last_name
             HAVING COUNT(sh.id) > 0
             ORDER BY revenue DESC
             LIMIT $1`,
            [parseInt(limit)]
        );

        res.json(result.rows.map(r => ({
            ...r,
            revenue: parseFloat(r.revenue),
            count: parseInt(r.count)
        })));
    } catch (error) {
        console.error('Error fetching top hairdressers:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get service breakdown
router.get('/service-breakdown', async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        
        let dateFilter = '';
        if (period === 'week') {
            dateFilter = `WHERE service_date_time >= date_trunc('week', CURRENT_DATE)`;
        } else if (period === 'month') {
            dateFilter = `WHERE service_date_time >= date_trunc('month', CURRENT_DATE)`;
        } else if (period === 'year') {
            dateFilter = `WHERE service_date_time >= date_trunc('year', CURRENT_DATE)`;
        }

        const result = await pool.query(
            `SELECT 
                service_name,
                COUNT(*) as count,
                COALESCE(SUM(price_salon), 0) as revenue
             FROM service_history
             ${dateFilter}
             GROUP BY service_name
             ORDER BY count DESC`
        );

        res.json(result.rows.map(r => ({
            ...r,
            revenue: parseFloat(r.revenue),
            count: parseInt(r.count)
        })));
    } catch (error) {
        console.error('Error fetching service breakdown:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get payment method stats
router.get('/payment-methods', async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        
        let dateFilter = '';
        if (period === 'week') {
            dateFilter = `WHERE service_date_time >= date_trunc('week', CURRENT_DATE)`;
        } else if (period === 'month') {
            dateFilter = `WHERE service_date_time >= date_trunc('month', CURRENT_DATE)`;
        } else if (period === 'year') {
            dateFilter = `WHERE service_date_time >= date_trunc('year', CURRENT_DATE)`;
        }

        const result = await pool.query(
            `SELECT 
                payment_method,
                COUNT(*) as count,
                COALESCE(SUM(price_salon), 0) as total
             FROM service_history
             ${dateFilter}
             GROUP BY payment_method`
        );

        const stats = {
            cash: { count: 0, total: 0 },
            card: { count: 0, total: 0 }
        };

        result.rows.forEach(r => {
            stats[r.payment_method] = {
                count: parseInt(r.count),
                total: parseFloat(r.total)
            };
        });

        res.json(stats);
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get recent transactions
router.get('/recent-transactions', async (req, res) => {
    try {
        const { limit = 5 } = req.query;
        
        const result = await pool.query(
            `SELECT 
                sh.*,
                h.first_name || ' ' || h.last_name as hairdresser_name,
                s.name as salon_name
             FROM service_history sh
             LEFT JOIN hairdressers h ON sh.hairdresser_id = h.id
             LEFT JOIN salons s ON sh.salon_id = s.id
             ORDER BY sh.service_date_time DESC
             LIMIT $1`,
            [parseInt(limit)]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching recent transactions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get payroll data
router.get('/payroll', async (req, res) => {
    try {
        const { month, salon_id } = req.query;
        
        let dateFilter = '';
        const params = [];
        let paramIndex = 1;

        if (month) {
            const [year, monthNum] = month.split('-');
            dateFilter = `AND sh.service_date_time >= $${paramIndex} AND sh.service_date_time < $${paramIndex + 1}`;
            params.push(`${year}-${monthNum}-01`, `${year}-${parseInt(monthNum) + 1 > 12 ? parseInt(year) + 1 : year}-${(parseInt(monthNum) % 12) + 1}-01`);
            paramIndex += 2;
        } else {
            dateFilter = `AND sh.service_date_time >= date_trunc('month', CURRENT_DATE) AND sh.service_date_time < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'`;
        }

        if (salon_id) {
            dateFilter += ` AND sh.salon_id = $${paramIndex}`;
            params.push(salon_id);
        }

        const result = await pool.query(
            `SELECT 
                h.id,
                h.first_name,
                h.last_name,
                COUNT(sh.id) as transaction_count,
                COALESCE(SUM(sh.price_salon), 0) as total_salon,
                COALESCE(SUM(sh.price_coiffeur), 0) as total_coiffeur
             FROM hairdressers h
             LEFT JOIN service_history sh ON h.id = sh.hairdresser_id ${dateFilter}
             WHERE h.is_active = true
             GROUP BY h.id, h.first_name, h.last_name
             ORDER BY total_coiffeur DESC`,
            params
        );

        // Get fixed salaries from assignments
        const assignmentsResult = await pool.query(
            `SELECT hairdresser_id, SUM(fixed_salary) as fixed_salary
             FROM assignments
             WHERE (end_date IS NULL OR end_date >= CURRENT_DATE)
             ${salon_id ? 'AND salon_id = $1' : ''}
             GROUP BY hairdresser_id`,
            salon_id ? [salon_id] : []
        );

        const fixedSalaries = {};
        assignmentsResult.rows.forEach(a => {
            fixedSalaries[a.hairdresser_id] = parseFloat(a.fixed_salary);
        });

        const payrollData = result.rows.map(r => ({
            hairdresser: {
                id: r.id,
                first_name: r.first_name,
                last_name: r.last_name
            },
            transactionCount: parseInt(r.transaction_count),
            totalSalon: parseFloat(r.total_salon),
            totalCoiffeur: parseFloat(r.total_coiffeur),
            fixedSalary: fixedSalaries[r.id] || 0,
            totalEarnings: parseFloat(r.total_coiffeur) + (fixedSalaries[r.id] || 0)
        }));

        res.json(payrollData);
    } catch (error) {
        console.error('Error fetching payroll:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get hairdresser personal stats (for coiffeur dashboard)
router.get('/hairdresser/:hairdresserId', async (req, res) => {
    try {
        const { hairdresserId } = req.params;

        // Today
        const today = await pool.query(
            `SELECT 
                COUNT(*) as count,
                COALESCE(SUM(price_coiffeur), 0) as earnings
             FROM service_history
             WHERE hairdresser_id = $1 AND DATE(service_date_time) = CURRENT_DATE`,
            [hairdresserId]
        );

        // This week
        const week = await pool.query(
            `SELECT 
                COUNT(*) as count,
                COALESCE(SUM(price_coiffeur), 0) as earnings
             FROM service_history
             WHERE hairdresser_id = $1 
               AND service_date_time >= date_trunc('week', CURRENT_DATE)`,
            [hairdresserId]
        );

        // This month
        const month = await pool.query(
            `SELECT 
                COUNT(*) as count,
                COALESCE(SUM(price_coiffeur), 0) as earnings
             FROM service_history
             WHERE hairdresser_id = $1 
               AND service_date_time >= date_trunc('month', CURRENT_DATE)`,
            [hairdresserId]
        );

        // Weekly chart data
        const weeklyData = await pool.query(
            `SELECT 
                DATE(service_date_time) as date,
                COALESCE(SUM(price_coiffeur), 0) as earnings,
                COUNT(*) as services
             FROM service_history
             WHERE hairdresser_id = $1 
               AND service_date_time >= CURRENT_DATE - INTERVAL '7 days'
             GROUP BY DATE(service_date_time)
             ORDER BY date`,
            [hairdresserId]
        );

        // Fill in missing days for chart
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const label = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
            
            const existing = weeklyData.rows.find(r => 
                r.date.toISOString().split('T')[0] === dateStr
            );
            
            chartData.push({
                label,
                earnings: existing ? parseFloat(existing.earnings) : 0,
                services: existing ? parseInt(existing.services) : 0
            });
        }

        // Recent transactions
        const recent = await pool.query(
            `SELECT sh.*, s.name as salon_name
             FROM service_history sh
             LEFT JOIN salons s ON sh.salon_id = s.id
             WHERE sh.hairdresser_id = $1
             ORDER BY sh.service_date_time DESC
             LIMIT 10`,
            [hairdresserId]
        );

        res.json({
            todayEarnings: parseFloat(today.rows[0].earnings),
            todayServices: parseInt(today.rows[0].count),
            weekEarnings: parseFloat(week.rows[0].earnings),
            weekServices: parseInt(week.rows[0].count),
            monthEarnings: parseFloat(month.rows[0].earnings),
            monthServices: parseInt(month.rows[0].count),
            weeklyData: chartData,
            recentTransactions: recent.rows
        });
    } catch (error) {
        console.error('Error fetching hairdresser stats:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
