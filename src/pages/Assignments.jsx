import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2, User, Calendar, Percent, AlertCircle } from 'lucide-react';
import { Modal, DataTable } from '../components/UI';
import { assignmentsAPI, hairdressersAPI, salonsAPI } from '../services/api';

const Assignments = () => {
    const [assignments, setAssignments] = useState([]);
    const [hairdressers, setHairdressers] = useState([]);
    const [salons, setSalons] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        hairdresser_id: '',
        salon_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        compensation_type: 'commission',
        commission_percentage: 50,
        tax_percentage: 20,
        fixed_salary: 0
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [assignmentsData, hairdressersData, salonsData] = await Promise.all([
                assignmentsAPI.getAll(),
                hairdressersAPI.getAll(),
                salonsAPI.getAll()
            ]);
            setAssignments(assignmentsData);
            setHairdressers(hairdressersData.filter(h => h.is_active));
            setSalons(salonsData.filter(s => s.is_active));
        } catch (err) {
            setError(err.message || 'Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await assignmentsAPI.update(editing.id, formData);
            } else {
                await assignmentsAPI.create(formData);
            }
            setShowModal(false);
            resetForm();
            loadData();
        } catch (err) {
            setError(err.message || 'Erreur lors de la sauvegarde');
        }
    };

    const handleEdit = (item) => {
        setEditing(item);
        setFormData({
            hairdresser_id: item.hairdresser_id,
            salon_id: item.salon_id,
            start_date: item.start_date,
            end_date: item.end_date || '',
            compensation_type: item.compensation_type,
            commission_percentage: item.commission_percentage,
            tax_percentage: item.tax_percentage,
            fixed_salary: item.fixed_salary || 0
        });
        setShowModal(true);
    };

    const handleDelete = async (item) => {
        if (confirm('Supprimer cette affectation ?')) {
            try {
                await assignmentsAPI.delete(item.id);
                loadData();
            } catch (err) {
                setError(err.message || 'Erreur lors de la suppression');
            }
        }
    };

    const resetForm = () => {
        setEditing(null);
        setFormData({
            hairdresser_id: '',
            salon_id: '',
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
            compensation_type: 'commission',
            commission_percentage: 50,
            tax_percentage: 20,
            fixed_salary: 0
        });
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const getHairdresserName = (id) => {
        const h = hairdressers.find(h => h.id === id);
        return h ? `${h.first_name} ${h.last_name}` : 'Inconnu';
    };

    const getSalonName = (id) => {
        const s = salons.find(s => s.id === id);
        return s ? s.name : 'Inconnu';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getCompensationBadge = (type) => {
        switch (type) {
            case 'fixed': return { label: 'Fixe', class: 'badge-info' };
            case 'commission': return { label: 'Commission', class: 'badge-purple' };
            case 'mixed': return { label: 'Mixte', class: 'badge-gold' };
            default: return { label: type, class: 'badge-info' };
        }
    };

    const isActive = (assignment) => {
        if (assignment.end_date) {
            return new Date(assignment.end_date) >= new Date();
        }
        return true;
    };

    const columns = [
        {
            header: 'Coiffeur',
            render: (row) => {
                const h = hairdressers.find(h => h.id === row.hairdresser_id);
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 'var(--radius-full)',
                            background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: 'var(--font-size-xs)'
                        }}>
                            {h ? `${h.first_name[0]}${h.last_name[0]}` : '?'}
                        </div>
                        <span style={{ fontWeight: 500 }}>{getHairdresserName(row.hairdresser_id)}</span>
                    </div>
                );
            }
        },
        {
            header: 'Salon',
            render: (row) => (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    color: 'var(--color-text-secondary)'
                }}>
                    <Building2 size={16} />
                    {getSalonName(row.salon_id)}
                </div>
            )
        },
        {
            header: 'Période',
            render: (row) => (
                <div style={{ fontSize: 'var(--font-size-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Calendar size={14} />
                        {formatDate(row.start_date)}
                    </div>
                    {row.end_date && (
                        <div style={{
                            color: 'var(--color-text-muted)',
                            fontSize: 'var(--font-size-xs)',
                            marginTop: 'var(--space-1)'
                        }}>
                            → {formatDate(row.end_date)}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'Rémunération',
            render: (row) => {
                const badge = getCompensationBadge(row.compensation_type);
                return (
                    <div>
                        <span className={`badge ${badge.class}`}>{badge.label}</span>
                        <div style={{
                            marginTop: 'var(--space-1)',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-muted)'
                        }}>
                            {row.compensation_type !== 'fixed' && `${row.commission_percentage}% comm.`}
                            {row.compensation_type === 'mixed' && ` + ${row.fixed_salary}€`}
                            {row.compensation_type === 'fixed' && `${row.fixed_salary}€/mois`}
                        </div>
                    </div>
                );
            }
        },
        {
            header: 'Taxe',
            render: (row) => (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-1)',
                    color: 'var(--color-text-muted)'
                }}>
                    <Percent size={14} />
                    {row.tax_percentage}%
                </div>
            )
        },
        {
            header: 'Statut',
            render: (row) => (
                <span className={`badge ${isActive(row) ? 'badge-success' : 'badge-error'}`}>
                    {isActive(row) ? 'Active' : 'Terminée'}
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

    if (loading) {
        return (
            <div className="animate-fadeIn" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div className="loading-spinner" style={{ width: 48, height: 48, border: '4px solid var(--color-border)', borderTopColor: 'var(--color-primary-500)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            {error && (
                <div className="card" style={{ background: 'var(--color-error-light)', borderColor: 'var(--color-error)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
                    <AlertCircle size={20} style={{ color: 'var(--color-error)' }} />
                    <span style={{ color: 'var(--color-error)' }}>{error}</span>
                </div>
            )}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Affectations</h1>
                    <p className="page-subtitle">Gérez les affectations coiffeurs-salons et leurs règles de rémunération</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={18} />
                    Nouvelle Affectation
                </button>
            </div>

            <div className="card">
                <DataTable
                    columns={columns}
                    data={assignments}
                    emptyMessage="Aucune affectation enregistrée"
                />
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editing ? 'Modifier l\'Affectation' : 'Nouvelle Affectation'}
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
                            <label className="form-label">Coiffeur *</label>
                            <select
                                className="form-select"
                                value={formData.hairdresser_id}
                                onChange={(e) => setFormData({ ...formData, hairdresser_id: e.target.value })}
                                required
                            >
                                <option value="">Sélectionner un coiffeur</option>
                                {hairdressers.map(h => (
                                    <option key={h.id} value={h.id}>
                                        {h.first_name} {h.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Salon *</label>
                            <select
                                className="form-select"
                                value={formData.salon_id}
                                onChange={(e) => setFormData({ ...formData, salon_id: e.target.value })}
                                required
                            >
                                <option value="">Sélectionner un salon</option>
                                {salons.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Date de début *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Date de fin</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                            />
                            <span className="form-hint">Laisser vide si en cours</span>
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
                            Règles de rémunération
                        </h4>

                        <div className="form-group">
                            <label className="form-label">Type de compensation *</label>
                            <select
                                className="form-select"
                                value={formData.compensation_type}
                                onChange={(e) => setFormData({ ...formData, compensation_type: e.target.value })}
                            >
                                <option value="commission">Commission uniquement</option>
                                <option value="fixed">Salaire fixe uniquement</option>
                                <option value="mixed">Mixte (fixe + commission)</option>
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
                            {formData.compensation_type !== 'fixed' && (
                                <div className="form-group">
                                    <label className="form-label">Commission (%)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.commission_percentage}
                                        onChange={(e) => setFormData({ ...formData, commission_percentage: e.target.value })}
                                        min="0"
                                        max="100"
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Taxe (%)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.tax_percentage}
                                    onChange={(e) => setFormData({ ...formData, tax_percentage: e.target.value })}
                                    min="0"
                                    max="100"
                                />
                            </div>

                            {(formData.compensation_type === 'fixed' || formData.compensation_type === 'mixed') && (
                                <div className="form-group">
                                    <label className="form-label">Salaire fixe (€)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.fixed_salary}
                                        onChange={(e) => setFormData({ ...formData, fixed_salary: e.target.value })}
                                        min="0"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Assignments;
