import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Phone, Mail, User, CreditCard, AlertCircle, Percent, Hash } from 'lucide-react';
import { Modal, DataTable } from '../components/UI';
import { hairdressersAPI } from '../services/api';

const Hairdressers = () => {
    const [hairdressers, setHairdressers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        matricule: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        rib_1: '',
        rib_2: '',
        tax_percentage: 0,
        is_active: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await hairdressersAPI.getAll();
            setHairdressers(data);
            setError(null);
        } catch (err) {
            setError('Erreur lors du chargement des coiffeurs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        try {
            if (editing) {
                await hairdressersAPI.update(editing.id, formData);
            } else {
                await hairdressersAPI.create(formData);
            }
            setShowModal(false);
            resetForm();
            loadData();
        } catch (err) {
            setError('Erreur lors de l\'enregistrement');
            console.error(err);
        }
    };

    const handleEdit = (item) => {
        setEditing(item);
        setFormData({
            matricule: item.matricule || '',
            first_name: item.first_name,
            last_name: item.last_name,
            email: item.email || '',
            phone: item.phone || '',
            rib_1: item.rib_1 || '',
            rib_2: item.rib_2 || '',
            tax_percentage: item.tax_percentage || 0,
            is_active: item.is_active
        });
        setShowModal(true);
    };

    const handleDelete = async (item) => {
        if (confirm(`Supprimer ${item.first_name} ${item.last_name} ?`)) {
            try {
                await hairdressersAPI.delete(item.id);
                loadData();
            } catch (err) {
                setError('Erreur lors de la suppression');
                console.error(err);
            }
        }
    };

    const resetForm = () => {
        setEditing(null);
        setFormData({
            matricule: '',
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            rib_1: '',
            rib_2: '',
            tax_percentage: 0,
            is_active: true
        });
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const getInitials = (first, last) => {
        return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
    };

    const columns = [
        {
            header: 'Coiffeur',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 'var(--radius-full)',
                        background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: 'var(--font-size-sm)'
                    }}>
                        {getInitials(row.first_name, row.last_name)}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600 }}>{row.first_name} {row.last_name}</div>
                        {row.matricule && (
                            <div style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-primary-400)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-1)'
                            }}>
                                <Hash size={12} />
                                {row.matricule}
                            </div>
                        )}
                    </div>
                </div>
            )
        },
        {
            header: 'Contact',
            render: (row) => (
                <div style={{ fontSize: 'var(--font-size-sm)' }}>
                    {row.phone && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            color: 'var(--color-text-secondary)'
                        }}>
                            <Phone size={14} />
                            {row.phone}
                        </div>
                    )}
                    {row.email && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            color: 'var(--color-text-muted)',
                            marginTop: 'var(--space-1)'
                        }}>
                            <Mail size={12} />
                            {row.email}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'RIB',
            render: (row) => (
                <div style={{ fontSize: 'var(--font-size-xs)' }}>
                    {row.rib_1 ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            color: 'var(--color-text-secondary)'
                        }}>
                            <CreditCard size={14} />
                            {row.rib_1.substring(0, 12)}...
                        </div>
                    ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>RIB 1: —</span>
                    )}
                    {row.rib_2 ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            color: 'var(--color-text-muted)',
                            marginTop: 'var(--space-1)'
                        }}>
                            <CreditCard size={14} />
                            {row.rib_2.substring(0, 12)}...
                        </div>
                    ) : (
                        <span style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-1)', display: 'block' }}>RIB 2: —</span>
                    )}
                </div>
            )
        },
        {
            header: 'Taxe',
            render: (row) => (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-1)',
                    color: 'var(--color-text-secondary)'
                }}>
                    <Percent size={14} />
                    {row.tax_percentage || 0}%
                </div>
            )
        },
        {
            header: 'Statut',
            render: (row) => (
                <span className={`badge ${row.is_active ? 'badge-success' : 'badge-error'}`}>
                    {row.is_active ? 'Actif' : 'Inactif'}
                </span>
            )
        },
        {
            header: 'Actions',
            width: '120px',
            render: (row) => (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
                        style={{ color: 'var(--color-error)' }}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Gestion des Coiffeurs</h1>
                    <p className="page-subtitle">Gérez votre équipe de coiffeurs</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={18} />
                    Nouveau Coiffeur
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="stat-card">
                    <div className="stat-card-icon purple">
                        <User size={24} />
                    </div>
                    <div className="stat-card-value" style={{ marginTop: 'var(--space-4)' }}>
                        {hairdressers.length}
                    </div>
                    <div className="stat-card-label">Total coiffeurs</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon green">
                        <User size={24} />
                    </div>
                    <div className="stat-card-value" style={{ marginTop: 'var(--space-4)' }}>
                        {hairdressers.filter(h => h.is_active).length}
                    </div>
                    <div className="stat-card-label">Actifs</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon gold">
                        <User size={24} />
                    </div>
                    <div className="stat-card-value" style={{ marginTop: 'var(--space-4)' }}>
                        {hairdressers.filter(h => !h.is_active).length}
                    </div>
                    <div className="stat-card-label">Inactifs</div>
                </div>
            </div>

            {error && (
                <div style={{
                    padding: 'var(--space-4)',
                    marginBottom: 'var(--space-4)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    color: '#ef4444'
                }}>
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div className="card">
                {loading ? (
                    <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        Chargement...
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={hairdressers}
                        emptyMessage="Aucun coiffeur enregistré"
                    />
                )}
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editing ? 'Modifier le Coiffeur' : 'Nouveau Coiffeur'}
                size="lg"
                footer={
                    <>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowModal(false)}
                        >
                            Annuler
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSubmit}
                        >
                            {editing ? 'Enregistrer' : 'Créer'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Matricule</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.matricule}
                                onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                                placeholder="COIF-001"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Taxe (%)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.tax_percentage}
                                onChange={(e) => setFormData({ ...formData, tax_percentage: parseFloat(e.target.value) || 0 })}
                                placeholder="20"
                                min="0"
                                max="100"
                                step="0.01"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Prénom *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                placeholder="Prénom"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Nom *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                placeholder="Nom"
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
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

                        <div className="form-group">
                            <label className="form-label">Téléphone</label>
                            <input
                                type="tel"
                                className="form-input"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="06 XX XX XX XX"
                            />
                        </div>
                    </div>

                    <div style={{
                        borderTop: '1px solid var(--color-border)',
                        marginTop: 'var(--space-4)',
                        paddingTop: 'var(--space-4)'
                    }}>
                        <h4 style={{
                            marginBottom: 'var(--space-4)',
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-muted)'
                        }}>
                            Informations bancaires
                        </h4>

                        <div className="form-group">
                            <label className="form-label">RIB 1</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.rib_1}
                                onChange={(e) => setFormData({ ...formData, rib_1: e.target.value })}
                                placeholder="IBAN"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">RIB 2 (optionnel)</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.rib_2}
                                onChange={(e) => setFormData({ ...formData, rib_2: e.target.value })}
                                placeholder="IBAN secondaire"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Statut</label>
                        <select
                            className="form-select"
                            value={formData.is_active ? 'active' : 'inactive'}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                        >
                            <option value="active">Actif</option>
                            <option value="inactive">Inactif</option>
                        </select>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Hairdressers;
