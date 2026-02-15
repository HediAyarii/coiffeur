import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Get all users
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.username, u.role, u.name, u.email, u.is_active, u.salon_id, u.hairdresser_id,
                   s.name as salon_name,
                   h.first_name || ' ' || h.last_name as hairdresser_name
            FROM users u
            LEFT JOIN salons s ON u.salon_id = s.id
            LEFT JOIN hairdressers h ON u.hairdresser_id = h.id
            ORDER BY u.role, u.name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get single user
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT u.id, u.username, u.role, u.name, u.email, u.is_active, u.salon_id, u.hairdresser_id,
                   s.name as salon_name,
                   h.first_name || ' ' || h.last_name as hairdresser_name
            FROM users u
            LEFT JOIN salons s ON u.salon_id = s.id
            LEFT JOIN hairdressers h ON u.hairdresser_id = h.id
            WHERE u.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create new user (gérant or manual coiffeur account)
router.post('/', async (req, res) => {
    try {
        const { username, password, role, name, email, salon_id, hairdresser_id } = req.body;
        
        // Validation
        if (!username || !password || !role || !name) {
            return res.status(400).json({ error: 'Champs requis: username, password, role, name' });
        }
        
        if (!['coiffeur', 'gerant'].includes(role)) {
            return res.status(400).json({ error: 'Rôle invalide. Utilisez "coiffeur" ou "gerant"' });
        }
        
        // Check if username already exists
        const existing = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Ce nom d\'utilisateur existe déjà' });
        }
        
        const result = await pool.query(`
            INSERT INTO users (username, password_hash, role, name, email, salon_id, hairdresser_id, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, true)
            RETURNING id, username, role, name, email, salon_id, hairdresser_id, is_active
        `, [username, password, role, name, email || null, salon_id || null, hairdresser_id || null]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, role, name, email, salon_id, is_active } = req.body;
        
        // Check if user exists
        const existing = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        // Check if username is taken by another user
        if (username) {
            const duplicate = await pool.query(
                'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2', 
                [username, id]
            );
            if (duplicate.rows.length > 0) {
                return res.status(400).json({ error: 'Ce nom d\'utilisateur est déjà pris' });
            }
        }
        
        const result = await pool.query(`
            UPDATE users 
            SET username = COALESCE($1, username),
                role = COALESCE($2, role),
                name = COALESCE($3, name),
                email = $4,
                salon_id = $5,
                is_active = COALESCE($6, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING id, username, role, name, email, salon_id, is_active
        `, [username, role, name, email, salon_id, is_active, id]);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update password
router.put('/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;
        
        if (!password || password.length < 4) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 4 caractères' });
        }
        
        const result = await pool.query(`
            UPDATE users 
            SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id
        `, [password, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        res.json({ success: true, message: 'Mot de passe mis à jour' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Toggle user active status
router.put('/:id/toggle-active', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            UPDATE users 
            SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, username, role, name, is_active
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        res.json({ success: true, message: 'Utilisateur supprimé' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
