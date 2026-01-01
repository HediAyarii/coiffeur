import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Scissors, Clock, Euro, AlertCircle } from 'lucide-react';
import { Modal, DataTable } from '../components/UI';
import { servicesAPI } from '../services/api';

const Services = () => {
    const [services, setServices] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        price_salon: '',
        price_coiffeur: '',
        duration_minutes: 30,
        is_active: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await servicesAPI.getAll();
            setServices(data);
            setError(null);
        } catch (err) {
            setError('Erreur lors du chargement des services');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSave = {
                ...formData,
                price_salon: parseFloat(formData.price_salon) || 0,
                price_coiffeur: parseFloat(formData.price_coiffeur) || 0
            };

            if (editing) {
                await servicesAPI.update(editing.id, dataToSave);
            } else {
                await servicesAPI.create(dataToSave);
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
            name: item.name,
            price_salon: item.price_salon || item.price || '',
            price_coiffeur: item.price_coiffeur || '',
            duration_minutes: item.duration_minutes,
            is_active: item.is_active
        });
        setShowModal(true);
    };

    const handleDelete = async (item) => {
        if (confirm(`Supprimer le service "${item.name}" ?`)) {
            try {
                await servicesAPI.delete(item.id);
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
            name: '',
            price_salon: '',
            price_coiffeur: '',
            duration_minutes: 30,
            is_active: true
        });
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const formatDuration = (minutes) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);
    };

    const columns = [
        {
            header: 'Service',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 'var(--radius-xl)',
                        background: row.active
                            ? 'linear-gradient(135deg, var(--color-primary-100), var(--color-gold-100))'
                            : 'var(--color-bg-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: row.active ? 'var(--color-primary-600)' : 'var(--color-text-muted)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <Scissors size={22} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-base)' }}>{row.name}</div>
                        <div style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-1)'
                        }}>
                            <Clock size={12} />
                            {formatDuration(row.duration_minutes)}
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: 'Prix Salon',
            render: (row) => (
                <div style={{
                    fontWeight: 700,
                    fontSize: 'var(--font-size-lg)',
                    color: 'var(--color-gold-600)'
                }}>
                    {formatCurrency(row.price_salon)}
                </div>
            )
        },
        {
            header: 'Prix Coiffeur',
            render: (row) => (
                <div style={{
                    fontWeight: 600,
                    fontSize: 'var(--font-size-base)',
                    color: 'var(--color-primary-600)'
                }}>
                    {row.price_coiffeur ? formatCurrency(row.price_coiffeur) : '—'}
                </div>
            )
        },
        {
            header: 'Marge',
            render: (row) => {
                const prixSalon = row.price_salon || 0;
                const prixCoiffeur = row.price_coiffeur || 0;
                const marge = prixSalon - prixCoiffeur;
                if (!prixCoiffeur) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>;
                return (
                    <span className="badge badge-success">
                        +{formatCurrency(marge)}
                    </span>
                );
            }
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

    // Calculate stats
    const avgPrixSalon = services.length > 0
        ? services.reduce((sum, s) => sum + (s.price_salon || 0), 0) / services.length
        : 0;
    const avgPrixCoiffeur = services.filter(s => s.price_coiffeur).length > 0
        ? services.filter(s => s.price_coiffeur).reduce((sum, s) => sum + s.price_coiffeur, 0) / services.filter(s => s.price_coiffeur).length
        : 0;

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Catalogue Services</h1>
                    <p className="page-subtitle">Gérez vos prestations et tarifs</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={18} />
                    Nouveau Service
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

            {/* Stats */}
            <div className="grid grid-cols-4" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="stat-card">
                    <div className="stat-card-value">{services.length}</div>
                    <div className="stat-card-label">Services totaux</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value">{services.filter(s => s.is_active).length}</div>
                    <div className="stat-card-label">Services actifs</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value" style={{ color: 'var(--color-gold-600)' }}>
                        {formatCurrency(avgPrixSalon)}
                    </div>
                    <div className="stat-card-label">Prix salon moyen</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value" style={{ color: 'var(--color-primary-600)' }}>
                        {formatCurrency(avgPrixCoiffeur)}
                    </div>
                    <div className="stat-card-label">Prix coiffeur moyen</div>
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        Chargement...
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={services}
                        emptyMessage="Aucun service enregistré"
                    />
                )}
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editing ? 'Modifier le Service' : 'Nouveau Service'}
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
                    <div className="form-group">
                        <label className="form-label">Nom du service *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Coupe Homme, Coloration..."
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Prix Salon (€) *</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.price_salon}
                                onChange={(e) => setFormData({ ...formData, price_salon: e.target.value })}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                required
                            />
                            <span className="form-hint">Prix facturé au client</span>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Prix Coiffeur (€)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.price_coiffeur}
                                onChange={(e) => setFormData({ ...formData, price_coiffeur: e.target.value })}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                            />
                            <span className="form-hint">Part versée au coiffeur</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Durée (minutes)</label>
                        <input
                            type="number"
                            className="form-input"
                            value={formData.duration_minutes}
                            onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                            min="5"
                            step="5"
                        />
                    </div>

                    <div className="form-group">
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            />
                            <span className="toggle-switch"></span>
                            <span>Service actif</span>
                        </label>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Services;
