import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Get all product categories
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM product_categories ORDER BY name'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching product categories:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get category by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM product_categories WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching product category:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create category
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        const result = await pool.query(
            'INSERT INTO product_categories (name) VALUES ($1) RETURNING *',
            [name]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating product category:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update category
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const result = await pool.query(
            'UPDATE product_categories SET name = $1 WHERE id = $2 RETURNING *',
            [name, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating product category:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete category
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM product_categories WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }
        res.json({ message: 'Catégorie supprimée', category: result.rows[0] });
    } catch (error) {
        console.error('Error deleting product category:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
