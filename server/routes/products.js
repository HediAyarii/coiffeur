import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// ========================================
// PRODUCTS ROUTES
// ========================================

// Get all products with their total stock across all salons
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, c.name as category_name,
                    COALESCE(SUM(ps.quantity), 0) as total_stock,
                    COUNT(DISTINCT ps.salon_id) as salon_count
             FROM products p
             LEFT JOIN product_categories c ON p.category_id = c.id
             LEFT JOIN product_stock ps ON p.id = ps.product_id
             WHERE p.is_active = true
             GROUP BY p.id, c.name
             ORDER BY p.name`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get products with stock for a specific salon
router.get('/salon/:salonId', async (req, res) => {
    try {
        const { salonId } = req.params;
        const result = await pool.query(
            `SELECT p.*, c.name as category_name, 
                    COALESCE(ps.quantity, 0) as stock_quantity,
                    COALESCE(ps.alert_threshold, 5) as alert_threshold,
                    ps.id as stock_id
             FROM products p
             LEFT JOIN product_categories c ON p.category_id = c.id
             LEFT JOIN product_stock ps ON p.id = ps.product_id AND ps.salon_id = $1
             WHERE p.is_active = true
             ORDER BY p.name`,
            [salonId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching salon products:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get all stock details for a product across all salons
router.get('/:productId/stock', async (req, res) => {
    try {
        const { productId } = req.params;
        const result = await pool.query(
            `SELECT ps.*, s.name as salon_name, s.city as salon_city
             FROM product_stock ps
             JOIN salons s ON ps.salon_id = s.id
             WHERE ps.product_id = $1
             ORDER BY s.name`,
            [productId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching product stock:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get low stock products (per salon)
router.get('/low-stock', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, c.name as category_name, s.name as salon_name, s.city as salon_city,
                    ps.quantity as stock_quantity, ps.alert_threshold, ps.salon_id
             FROM products p
             JOIN product_stock ps ON p.id = ps.product_id
             JOIN salons s ON ps.salon_id = s.id
             LEFT JOIN product_categories c ON p.category_id = c.id
             WHERE ps.quantity <= ps.alert_threshold AND p.is_active = true
             ORDER BY ps.quantity, p.name`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching low stock products:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get low stock products for a specific salon
router.get('/low-stock/salon/:salonId', async (req, res) => {
    try {
        const { salonId } = req.params;
        const result = await pool.query(
            `SELECT p.*, c.name as category_name,
                    ps.quantity as stock_quantity, ps.alert_threshold
             FROM products p
             JOIN product_stock ps ON p.id = ps.product_id
             LEFT JOIN product_categories c ON p.category_id = c.id
             WHERE ps.salon_id = $1 AND ps.quantity <= ps.alert_threshold AND p.is_active = true
             ORDER BY ps.quantity, p.name`,
            [salonId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching low stock products:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get stock summary for dashboard - MUST BE BEFORE /:id route
router.get('/summary', async (req, res) => {
    try {
        const { salon_id } = req.query;
        
        let whereClause = salon_id ? 'WHERE ps.salon_id = $1' : '';
        const params = salon_id ? [salon_id] : [];
        
        const result = await pool.query(`
            SELECT 
                COUNT(DISTINCT p.id) as total_products,
                COALESCE(SUM(ps.quantity), 0) as total_stock,
                COALESCE(SUM(ps.quantity * p.purchase_price), 0) as stock_value_purchase,
                COALESCE(SUM(ps.quantity * p.sale_price), 0) as stock_value_sale,
                COUNT(CASE WHEN ps.quantity <= ps.alert_threshold THEN 1 END) as low_stock_count
            FROM products p
            LEFT JOIN product_stock ps ON p.id = ps.product_id
            ${whereClause}
        `, params);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching stock summary:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get stock movements history - MUST BE BEFORE /:id route
router.get('/movements', async (req, res) => {
    try {
        const { salon_id, product_id, start_date, end_date, limit = 100 } = req.query;
        
        let query = `
            SELECT sm.*, p.name as product_name, p.reference as product_reference,
                   s.name as salon_name, c.name as category_name
            FROM stock_movements sm
            JOIN products p ON sm.product_id = p.id
            JOIN salons s ON sm.salon_id = s.id
            LEFT JOIN product_categories c ON p.category_id = c.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        
        if (salon_id) {
            query += ` AND sm.salon_id = $${paramIndex}`;
            params.push(salon_id);
            paramIndex++;
        }
        
        if (product_id) {
            query += ` AND sm.product_id = $${paramIndex}`;
            params.push(product_id);
            paramIndex++;
        }
        
        if (start_date) {
            query += ` AND sm.created_at >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }
        
        if (end_date) {
            query += ` AND sm.created_at <= $${paramIndex}`;
            params.push(end_date);
            paramIndex++;
        }
        
        query += ` ORDER BY sm.created_at DESC LIMIT $${paramIndex}`;
        params.push(parseInt(limit));
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching movements:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT p.*, c.name as category_name
             FROM products p
             LEFT JOIN product_categories c ON p.category_id = c.id
             WHERE p.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create product
router.post('/', async (req, res) => {
    try {
        const { name, reference, category_id, purchase_price, sale_price } = req.body;
        
        const result = await pool.query(
            `INSERT INTO products (name, reference, category_id, purchase_price, sale_price) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [name, reference || null, category_id || null, purchase_price || 0, sale_price || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update product
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, reference, category_id, purchase_price, sale_price, is_active } = req.body;
        
        const result = await pool.query(
            `UPDATE products 
             SET name = $1, reference = $2, category_id = $3, purchase_price = $4, sale_price = $5, is_active = $6
             WHERE id = $7 
             RETURNING *`,
            [name, reference, category_id, purchase_price, sale_price, is_active !== false, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete product (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'UPDATE products SET is_active = false WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }
        res.json({ message: 'Produit supprimé', product: result.rows[0] });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ========================================
// STOCK MANAGEMENT ROUTES
// ========================================

// Set or update stock for a product in a salon
router.post('/stock', async (req, res) => {
    try {
        const { product_id, salon_id, quantity, alert_threshold } = req.body;
        
        const result = await pool.query(
            `INSERT INTO product_stock (product_id, salon_id, quantity, alert_threshold)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (product_id, salon_id) 
             DO UPDATE SET quantity = $3, alert_threshold = $4
             RETURNING *`,
            [product_id, salon_id, quantity || 0, alert_threshold || 5]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error setting stock:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update stock quantity (add or remove)
router.patch('/stock/:stockId', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { stockId } = req.params;
        const { quantity_change, movement_type, reason, unit_price } = req.body;
        
        // Get current stock
        const currentStock = await client.query(
            'SELECT * FROM product_stock WHERE id = $1',
            [stockId]
        );
        
        if (currentStock.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Stock non trouvé' });
        }
        
        const stock = currentStock.rows[0];
        const previousQuantity = stock.quantity;
        const newQuantity = previousQuantity + quantity_change;
        
        if (newQuantity < 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Stock insuffisant' });
        }
        
        // Update stock
        const updateResult = await client.query(
            'UPDATE product_stock SET quantity = $1 WHERE id = $2 RETURNING *',
            [newQuantity, stockId]
        );
        
        // Record movement
        await client.query(
            `INSERT INTO stock_movements 
             (product_id, salon_id, movement_type, quantity, previous_stock, new_stock, unit_price, total_price, reason)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                stock.product_id,
                stock.salon_id,
                movement_type || (quantity_change > 0 ? 'entry' : 'exit'),
                Math.abs(quantity_change),
                previousQuantity,
                newQuantity,
                unit_price || null,
                unit_price ? Math.abs(quantity_change) * unit_price : null,
                reason || null
            ]
        );
        
        await client.query('COMMIT');
        res.json(updateResult.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating stock:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        client.release();
    }
});

// Record a stock movement (entry, exit, adjustment, sale)
router.post('/movement', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { product_id, salon_id, movement_type, quantity, reason, unit_price } = req.body;
        
        // Get or create stock record
        let stockResult = await client.query(
            'SELECT * FROM product_stock WHERE product_id = $1 AND salon_id = $2',
            [product_id, salon_id]
        );
        
        let previousQuantity = 0;
        let stockId;
        
        if (stockResult.rows.length === 0) {
            // Create stock record
            const newStock = await client.query(
                'INSERT INTO product_stock (product_id, salon_id, quantity) VALUES ($1, $2, 0) RETURNING *',
                [product_id, salon_id]
            );
            stockId = newStock.rows[0].id;
        } else {
            stockId = stockResult.rows[0].id;
            previousQuantity = stockResult.rows[0].quantity;
        }
        
        // Calculate new quantity based on movement type
        let quantityChange = quantity;
        if (['exit', 'sale', 'transfer_out'].includes(movement_type)) {
            quantityChange = -Math.abs(quantity);
        } else if (['entry', 'transfer_in'].includes(movement_type)) {
            quantityChange = Math.abs(quantity);
        }
        // 'adjustment' can be positive or negative as provided
        
        const newQuantity = previousQuantity + quantityChange;
        
        if (newQuantity < 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Stock insuffisant pour cette opération' });
        }
        
        // Update stock
        await client.query(
            'UPDATE product_stock SET quantity = $1 WHERE id = $2',
            [newQuantity, stockId]
        );
        
        // Record movement
        const movementResult = await client.query(
            `INSERT INTO stock_movements 
             (product_id, salon_id, movement_type, quantity, previous_stock, new_stock, unit_price, total_price, reason)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                product_id,
                salon_id,
                movement_type,
                Math.abs(quantity),
                previousQuantity,
                newQuantity,
                unit_price || null,
                unit_price ? Math.abs(quantity) * unit_price : null,
                reason || null
            ]
        );
        
        await client.query('COMMIT');
        res.status(201).json({
            movement: movementResult.rows[0],
            new_stock: newQuantity
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error recording movement:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        client.release();
    }
});

// ========================================
// PRODUCT SALES ROUTES
// ========================================

// Get sales with filters
router.get('/sales/list', async (req, res) => {
    try {
        const { salon_id, month, product_id, limit = 100 } = req.query;
        
        let query = `
            SELECT ps.*, p.name as product_name, p.reference as product_reference,
                   s.name as salon_name, s.city as salon_city
            FROM product_sales ps
            JOIN products p ON ps.product_id = p.id
            JOIN salons s ON ps.salon_id = s.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        
        if (salon_id) {
            query += ` AND ps.salon_id = $${paramIndex}`;
            params.push(salon_id);
            paramIndex++;
        }
        
        if (month) {
            query += ` AND TO_CHAR(ps.sale_date, 'YYYY-MM') = $${paramIndex}`;
            params.push(month);
            paramIndex++;
        }
        
        if (product_id) {
            query += ` AND ps.product_id = $${paramIndex}`;
            params.push(product_id);
            paramIndex++;
        }
        
        query += ` ORDER BY ps.sale_date DESC, ps.created_at DESC LIMIT $${paramIndex}`;
        params.push(parseInt(limit));
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get sales summary by salon for a month
router.get('/sales/summary', async (req, res) => {
    try {
        const { month } = req.query;
        const targetMonth = month || new Date().toISOString().slice(0, 7);
        
        const result = await pool.query(`
            SELECT 
                s.id as salon_id,
                s.name as salon_name,
                s.city as salon_city,
                COUNT(ps.id) as sale_count,
                COALESCE(SUM(ps.quantity), 0) as total_quantity,
                COALESCE(SUM(ps.total_price), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN ps.payment_method = 'cash' THEN ps.total_price ELSE 0 END), 0) as cash_total,
                COALESCE(SUM(CASE WHEN ps.payment_method = 'card' THEN ps.total_price ELSE 0 END), 0) as card_total
            FROM salons s
            LEFT JOIN product_sales ps ON s.id = ps.salon_id AND TO_CHAR(ps.sale_date, 'YYYY-MM') = $1
            WHERE s.is_active = true
            GROUP BY s.id, s.name, s.city
            ORDER BY total_revenue DESC, s.name
        `, [targetMonth]);
        
        // Calculate totals
        const totals = result.rows.reduce((acc, row) => ({
            total_sales: acc.total_sales + parseInt(row.sale_count),
            total_quantity: acc.total_quantity + parseInt(row.total_quantity),
            total_revenue: acc.total_revenue + parseFloat(row.total_revenue),
            cash_total: acc.cash_total + parseFloat(row.cash_total),
            card_total: acc.card_total + parseFloat(row.card_total)
        }), { total_sales: 0, total_quantity: 0, total_revenue: 0, cash_total: 0, card_total: 0 });
        
        res.json({
            month: targetMonth,
            salons: result.rows,
            totals
        });
    } catch (error) {
        console.error('Error fetching sales summary:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create a sale
router.post('/sales', async (req, res) => {
    const client = await pool.connect();
    try {
        const { product_id, salon_id, quantity, unit_price, sale_date, payment_method, notes, vat_rate = 20, sale_type = 'sale' } = req.body;
        
        if (!product_id || !salon_id || !quantity) {
            return res.status(400).json({ error: 'product_id, salon_id et quantity sont requis' });
        }
        
        // For internal use, price and vat are 0
        const isInternalUse = sale_type === 'internal_use';
        const actualUnitPrice = isInternalUse ? 0 : unit_price;
        const actualVatRate = isInternalUse ? 0 : vat_rate;
        
        if (!isInternalUse && !unit_price) {
            return res.status(400).json({ error: 'unit_price est requis pour une vente' });
        }
        
        await client.query('BEGIN');
        
        const total_price = quantity * actualUnitPrice;
        // Calculate VAT amount: total_price * vat_rate / (100 + vat_rate) for included VAT
        const vat_amount = isInternalUse ? 0 : Math.round(total_price * actualVatRate / (100 + actualVatRate) * 100) / 100;
        
        // Insert sale record
        const saleResult = await client.query(`
            INSERT INTO product_sales (product_id, salon_id, quantity, unit_price, total_price, sale_date, payment_method, notes, vat_rate, vat_amount, sale_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            product_id,
            salon_id,
            quantity,
            actualUnitPrice,
            total_price,
            sale_date || new Date().toISOString().split('T')[0],
            isInternalUse ? 'salon' : (payment_method || 'cash'),
            notes || null,
            actualVatRate,
            vat_amount,
            sale_type
        ]);
        
        // Decrease stock if exists
        const stockCheck = await client.query(
            'SELECT id, quantity FROM product_stock WHERE product_id = $1 AND salon_id = $2',
            [product_id, salon_id]
        );
        
        if (stockCheck.rows.length > 0) {
            const currentStock = stockCheck.rows[0].quantity;
            const newStock = Math.max(0, currentStock - quantity);
            
            await client.query(
                'UPDATE product_stock SET quantity = $1 WHERE id = $2',
                [newStock, stockCheck.rows[0].id]
            );
            
            // Record movement
            const movementReason = isInternalUse ? 'Utilisation interne salon' : 'Vente produit';
            await client.query(`
                INSERT INTO stock_movements 
                (product_id, salon_id, movement_type, quantity, previous_stock, new_stock, unit_price, total_price, reason)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [product_id, salon_id, isInternalUse ? 'usage' : 'sale', quantity, currentStock, newStock, actualUnitPrice, total_price, movementReason]);
        }
        
        await client.query('COMMIT');
        
        // Return sale with product info
        const result = await pool.query(`
            SELECT ps.*, p.name as product_name, s.name as salon_name
            FROM product_sales ps
            JOIN products p ON ps.product_id = p.id
            JOIN salons s ON ps.salon_id = s.id
            WHERE ps.id = $1
        `, [saleResult.rows[0].id]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating sale:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        client.release();
    }
});

// Delete a sale
router.delete('/sales/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM product_sales WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vente non trouvée' });
        }
        
        res.json({ message: 'Vente supprimée', sale: result.rows[0] });
    } catch (error) {
        console.error('Error deleting sale:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
