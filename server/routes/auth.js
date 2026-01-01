import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check admin credentials
        if (username === 'admin' && password === 'admin123') {
            return res.json({
                success: true,
                user: {
                    id: 'admin',
                    role: 'admin',
                    name: 'Administrateur',
                    username: 'admin'
                }
            });
        }

        // Check hairdresser credentials (email as username, phone as password)
        const result = await pool.query(
            `SELECT u.*, h.id as hairdresser_id, h.first_name, h.last_name 
             FROM users u 
             LEFT JOIN hairdressers h ON u.hairdresser_id = h.id 
             WHERE LOWER(u.username) = LOWER($1) AND u.password_hash = $2 AND u.is_active = true`,
            [username, password]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            return res.json({
                success: true,
                user: {
                    id: user.id,
                    role: user.role,
                    name: user.name,
                    email: user.email,
                    hairdresserId: user.hairdresser_id
                }
            });
        }

        res.status(401).json({ success: false, error: 'Identifiants incorrects' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Get current user info
router.get('/me', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({ error: 'Non authentifié' });
        }

        if (userId === 'admin') {
            return res.json({
                id: 'admin',
                role: 'admin',
                name: 'Administrateur'
            });
        }

        const result = await pool.query(
            'SELECT id, username, role, name, email, hairdresser_id FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
