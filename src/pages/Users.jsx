import { useState, useEffect } from 'react';
import { usersAPI, salonsAPI, hairdressersAPI } from '../services/api';
import { Modal } from '../components/UI';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [salons, setSalons] = useState([]);
    const [hairdressers, setHairdressers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'coiffeur',
        name: '',
        email: '',
        salon_id: '',
        hairdresser_id: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersData, salonsData, hairdressersData] = await Promise.all([
                usersAPI.getAll(),
                salonsAPI.getAll(),
                hairdressersAPI.getAll()
            ]);
            setUsers(usersData);
            setSalons(salonsData);
            setHairdressers(hairdressersData);
        } catch (err) {
            setError('Erreur lors du chargement des données');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            role: 'coiffeur',
            name: '',
            email: '',
            salon_id: '',
            hairdresser_id: ''
        });
        setEditing(null);
    };

    const handleHairdresserChange = (hairdresserId) => {
        if (!hairdresserId) {
            setFormData({ ...formData, hairdresser_id: '', username: '', name: '', email: '' });
            return;
        }
        const h = hairdressers.find(x => x.id === hairdresserId);
        if (h) {
            // Priorité: email > matricule pour l'identifiant
            const username = h.email || h.matricule || '';
            setFormData({
                ...formData,
                hairdresser_id: hairdresserId,
                username: username,
                name: `${h.first_name} ${h.last_name}`,
                email: h.email || ''
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        try {
            if (editing) {
                await usersAPI.update(editing.id, {
                    username: formData.username,
                    role: formData.role,
                    name: formData.name,
                    email: formData.email || null,
                    salon_id: formData.salon_id || null
                });
            } else {
                if (!formData.password) {
                    setError('Le mot de passe est requis');
                    return;
                }
                await usersAPI.create(formData);
            }
            setShowModal(false);
            resetForm();
            await loadData();
        } catch (err) {
            setError(err.message || 'Erreur lors de l\'enregistrement');
        }
    };

    const handleEdit = (user) => {
        setEditing(user);
        setFormData({
            username: user.username,
            password: '',
            role: user.role,
            name: user.name,
            email: user.email || '',
            salon_id: user.salon_id || '',
            hairdresser_id: user.hairdresser_id || ''
        });
        setShowModal(true);
    };

    const handlePasswordChange = (user) => {
        setSelectedUser(user);
        setNewPassword('');
        setShowPasswordModal(true);
    };

    const submitPasswordChange = async () => {
        if (!newPassword || newPassword.length < 4) {
            setError('Le mot de passe doit contenir au moins 4 caractères');
            return;
        }
        try {
            await usersAPI.updatePassword(selectedUser.id, newPassword);
            setShowPasswordModal(false);
            setNewPassword('');
            setSelectedUser(null);
            alert('Mot de passe mis à jour avec succès');
        } catch (err) {
            setError(err.message || 'Erreur lors du changement de mot de passe');
        }
    };

    const handleToggleActive = async (user) => {
        try {
            await usersAPI.toggleActive(user.id);
            await loadData();
        } catch (err) {
            setError(err.message || 'Erreur lors du changement de statut');
        }
    };

    const handleDelete = async (user) => {
        if (!confirm(`Voulez-vous vraiment supprimer l'utilisateur "${user.name}" ?`)) {
            return;
        }
        try {
            await usersAPI.delete(user.id);
            await loadData();
        } catch (err) {
            setError(err.message || 'Erreur lors de la suppression');
        }
    };

    const getRoleBadge = (role) => {
        const colors = {
            admin: { bg: '#4c1d95', text: '#fff' },
            gerant: { bg: '#0ea5e9', text: '#fff' },
            coiffeur: { bg: '#10b981', text: '#fff' }
        };
        const labels = {
            admin: 'Admin',
            gerant: 'Gérant',
            coiffeur: 'Coiffeur'
        };
        const style = colors[role] || { bg: '#6b7280', text: '#fff' };
        return (
            <span style={{
                background: style.bg,
                color: style.text,
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600'
            }}>
                {labels[role] || role}
            </span>
        );
    };

    // Filter coiffeurs who don't have an account yet
    const coiffeursWithoutAccount = hairdressers.filter(h => 
        !users.some(u => u.hairdresser_id === h.id)
    );

    if (loading) {
        return (
            <div className="page-content">
                <div className="loading">Chargement...</div>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Gestion des Comptes</h1>
                    <p className="page-subtitle">Gérer les accès utilisateurs et mots de passe</p>
                </div>
                <button 
                    className="btn btn-primary"
                    onClick={() => { resetForm(); setShowModal(true); }}
                >
                    <span className="icon">+</span>
                    Nouveau Compte
                </button>
            </div>

            {error && (
                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                    {error}
                    <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.5rem' }}>
                <div className="stat-card">
                    <div className="stat-title">Total Utilisateurs</div>
                    <div className="stat-value">{users.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-title">Gérants</div>
                    <div className="stat-value" style={{ color: '#0ea5e9' }}>
                        {users.filter(u => u.role === 'gerant').length}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-title">Coiffeurs</div>
                    <div className="stat-value" style={{ color: '#10b981' }}>
                        {users.filter(u => u.role === 'coiffeur').length}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-title">Comptes Actifs</div>
                    <div className="stat-value" style={{ color: '#22c55e' }}>
                        {users.filter(u => u.is_active).length}
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Liste des Comptes</h3>
                </div>
                <div className="card-content">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nom</th>
                                <th>Identifiant</th>
                                <th>Rôle</th>
                                <th>Salon</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} style={{ opacity: user.is_active ? 1 : 0.5 }}>
                                    <td>
                                        <div style={{ fontWeight: '500' }}>{user.name}</div>
                                        {user.email && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {user.email}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <code style={{ 
                                            background: 'var(--bg-secondary)', 
                                            padding: '0.25rem 0.5rem', 
                                            borderRadius: '4px',
                                            fontSize: '0.875rem'
                                        }}>
                                            {user.username}
                                        </code>
                                    </td>
                                    <td>{getRoleBadge(user.role)}</td>
                                    <td>{user.salon_name || '-'}</td>
                                    <td>
                                        <span style={{
                                            color: user.is_active ? '#22c55e' : '#ef4444',
                                            fontWeight: '500'
                                        }}>
                                            {user.is_active ? 'Actif' : 'Inactif'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button 
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handlePasswordChange(user)}
                                                title="Changer mot de passe"
                                            >
                                                🔑
                                            </button>
                                            <button 
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handleEdit(user)}
                                                title="Modifier"
                                            >
                                                ✏️
                                            </button>
                                            <button 
                                                className="btn btn-sm"
                                                style={{ 
                                                    background: user.is_active ? '#f97316' : '#22c55e',
                                                    color: '#fff'
                                                }}
                                                onClick={() => handleToggleActive(user)}
                                                title={user.is_active ? 'Désactiver' : 'Activer'}
                                            >
                                                {user.is_active ? '⏸️' : '▶️'}
                                            </button>
                                            <button 
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDelete(user)}
                                                title="Supprimer"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        Aucun compte utilisateur
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Info Card - Coiffeurs sans compte */}
            {coiffeursWithoutAccount.length > 0 && (
                <div className="card" style={{ marginTop: '1.5rem' }}>
                    <div className="card-header">
                        <h3 className="card-title">Coiffeurs sans compte</h3>
                    </div>
                    <div className="card-content">
                        <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                            Ces coiffeurs n'ont pas encore de compte utilisateur. Ajoutez-leur un email et un téléphone pour créer automatiquement leur compte.
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {coiffeursWithoutAccount.map(h => (
                                <span key={h.id} style={{
                                    background: 'var(--bg-secondary)',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem'
                                }}>
                                    {h.first_name} {h.last_name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Create/Edit User */}
            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); resetForm(); }}
                title={editing ? 'Modifier le Compte' : 'Nouveau Compte'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                            Annuler
                        </button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {editing ? 'Enregistrer' : 'Créer'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    {formData.role === 'coiffeur' && !editing && (
                        <div className="form-group">
                            <label className="form-label">Sélectionner un coiffeur</label>
                            <select
                                className="form-select"
                                value={formData.hairdresser_id}
                                onChange={(e) => handleHairdresserChange(e.target.value)}
                            >
                                <option value="">-- Saisie manuelle --</option>
                                {coiffeursWithoutAccount.map(h => (
                                    <option key={h.id} value={h.id}>
                                        {h.first_name} {h.last_name} {h.matricule ? `(${h.matricule})` : ''}
                                    </option>
                                ))}
                            </select>
                            <small style={{ color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                                Sélectionnez un coiffeur pour remplir automatiquement les champs
                            </small>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Nom complet *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Jean Dupont"
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Identifiant *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                placeholder="Ex: jean.dupont"
                                required
                            />
                        </div>
                        
                        {!editing && (
                            <div className="form-group">
                                <label className="form-label">Mot de passe *</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Min. 4 caractères"
                                    required={!editing}
                                />
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Rôle *</label>
                            <select
                                className="form-select"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="coiffeur">Coiffeur</option>
                                <option value="gerant">Gérant</option>
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="email@exemple.com"
                            />
                        </div>
                    </div>

                    {formData.role === 'gerant' && (
                        <div className="form-group">
                            <label className="form-label">Salon assigné</label>
                            <select
                                className="form-select"
                                value={formData.salon_id}
                                onChange={(e) => setFormData({ ...formData, salon_id: e.target.value })}
                            >
                                <option value="">Tous les salons</option>
                                {salons.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <small style={{ color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                                Laissez vide pour accès à tous les salons
                            </small>
                        </div>
                    )}
                </form>
            </Modal>

            {/* Modal: Change Password */}
            <Modal
                isOpen={showPasswordModal}
                onClose={() => { setShowPasswordModal(false); setNewPassword(''); }}
                title="Changer le mot de passe"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => { setShowPasswordModal(false); setNewPassword(''); }}>
                            Annuler
                        </button>
                        <button className="btn btn-primary" onClick={submitPasswordChange}>
                            Enregistrer
                        </button>
                    </>
                }
            >
                <div style={{ marginBottom: '1rem' }}>
                    <p>Changer le mot de passe pour : <strong>{selectedUser?.name}</strong></p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Identifiant: {selectedUser?.username}
                    </p>
                </div>
                <div className="form-group">
                    <label className="form-label">Nouveau mot de passe *</label>
                    <input
                        type="password"
                        className="form-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 4 caractères"
                        autoFocus
                    />
                </div>
            </Modal>
        </div>
    );
}
