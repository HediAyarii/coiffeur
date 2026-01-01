import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, Phone, Mail, Building2, AlertCircle } from 'lucide-react';
import { Modal, DataTable } from '../components/UI';
import { salonsAPI } from '../services/api';

const Salons = () => {
    const [salons, setSalons] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingSalon, setEditingSalon] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        city: '',
        phone: '',
        email: '',
        is_active: true
    });

    useEffect(() => {
        loadSalons();
    }, []);

    const loadSalons = async () => {
        try {
            setLoading(true);
            const data = await salonsAPI.getAll();
            setSalons(data);
            setError(null);
        } catch (err) {
            setError('Erreur lors du chargement des salons');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSalon) {
                await salonsAPI.update(editingSalon.id, formData);
            } else {
                await salonsAPI.create(formData);
            }
            setShowModal(false);
            resetForm();
            loadSalons();
        } catch (err) {
            setError('Erreur lors de l\'enregistrement');
            console.error(err);
        }
    };

    const handleEdit = (salon) => {
        setEditingSalon(salon);
        setFormData({
            name: salon.name,
            address: salon.address || '',
            city: salon.city || '',
            phone: salon.phone || '',
            email: salon.email || '',
            is_active: salon.is_active
        });
        setShowModal(true);
    };

    const handleDelete = async (salon) => {
        if (confirm(`Supprimer le salon "${salon.name}" ?`)) {
            try {
                await salonsAPI.delete(salon.id);
                loadSalons();
            } catch (err) {
                setError('Erreur lors de la suppression');
                console.error(err);
            }
        }
    };

    const resetForm = () => {
        setEditingSalon(null);
        setFormData({
            name: '',
            address: '',
            city: '',
            phone: '',
            email: '',
            is_active: true
        });
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const columns = [
        {
            header: 'Salon',
            accessor: 'name',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 'var(--radius-lg)',
                        background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-accent-500))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600
                    }}>
                        <Building2 size={20} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600 }}>{row.name}</div>
                        <div style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-1)'
                        }}>
                            <MapPin size={12} />
                            {row.city}
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: 'Adresse',
            accessor: 'address',
            render: (row) => (
                <span style={{ color: 'var(--color-text-secondary)' }}>
                    {row.address}
                </span>
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
                            <Mail size={14} />
                            {row.email}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'Statut',
            accessor: 'is_active',
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
                    <h1 className="page-title">Gestion des Salons</h1>
                    <p className="page-subtitle">Gérez vos établissements et leurs informations</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={18} />
                    Nouveau Salon
                </button>
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
                        data={salons}
                        emptyMessage="Aucun salon enregistré"
                    />
                )}
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingSalon ? 'Modifier le Salon' : 'Nouveau Salon'}
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
                            {editingSalon ? 'Enregistrer' : 'Créer'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Nom du salon *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Élégance Coiffure Paris"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Adresse</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Ex: 45 Avenue des Champs-Élysées"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Ville</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="Ex: Paris"
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Téléphone</label>
                            <input
                                type="tel"
                                className="form-input"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="01 XX XX XX XX"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="contact@salon.fr"
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

export default Salons;
