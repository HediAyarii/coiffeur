import React, { useState, useEffect } from 'react';
import {
    Plus,
    Calendar,
    CreditCard,
    Banknote,
    Trash2,
    AlertCircle
} from 'lucide-react';
import { Modal, DataTable } from '../components/UI';
import {
    transactionsAPI,
    servicesAPI,
    hairdressersAPI,
    salonsAPI
} from '../services/api';

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [services, setServices] = useState([]);
    const [hairdressers, setHairdressers] = useState([]);
    const [salons, setSalons] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedSalon, setSelectedSalon] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        salon_id: '',
        hairdresser_id: '',
        service_id: '',
        price_salon: '',
        price_coiffeur: '',
        payment_method: 'cash'
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        filterTransactions();
    }, [selectedSalon, selectedDate]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [servicesData, hairdressersData, salonsData] = await Promise.all([
                servicesAPI.getAll(),
                hairdressersAPI.getAll(),
                salonsAPI.getAll()
            ]);
            setServices(servicesData.filter(s => s.is_active));
            setHairdressers(hairdressersData.filter(h => h.is_active));
            setSalons(salonsData.filter(s => s.is_active));
            await filterTransactions();
        } catch (err) {
            console.error('Error loading data:', err);
            setError(err.message || 'Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const filterTransactions = async () => {
        try {
            const filters = {};
            if (selectedSalon) {
                filters.salon_id = selectedSalon;
            }
            if (selectedDate) {
                filters.date = selectedDate;
            }
            let txs = await transactionsAPI.getAll(filters);
            txs.sort((a, b) => new Date(b.service_date_time) - new Date(a.service_date_time));
            setTransactions(txs);
        } catch (err) {
            console.error('Error filtering transactions:', err);
            setError(err.message || 'Erreur lors du filtrage des transactions');
        }
    };

    const handleServiceChange = (serviceId) => {
        const service = services.find(s => s.id === serviceId);
        if (service) {
            setFormData({
                ...formData,
                service_id: serviceId,
                price_salon: service.price_salon || service.price || 0,
                price_coiffeur: service.price_coiffeur || 0
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const service = services.find(s => s.id === formData.service_id);

            await transactionsAPI.create({
                salon_id: formData.salon_id,
                hairdresser_id: formData.hairdresser_id,
                service_id: formData.service_id,
                service_name: service?.name || '',
                price: parseFloat(formData.price_salon) || 0,
                price_salon: parseFloat(formData.price_salon) || 0,
                price_coiffeur: parseFloat(formData.price_coiffeur) || 0,
                payment_method: formData.payment_method,
                service_date_time: new Date().toISOString(),
                // For compatibility with existing analytics
                commission_amount: parseFloat(formData.price_coiffeur) || 0,
                tax_amount: 0,
                tax_percentage: 0,
                commission_percentage: 0
            });

            setShowModal(false);
            resetForm();
            await filterTransactions();
        } catch (err) {
            console.error('Error creating transaction:', err);
            setError(err.message || 'Erreur lors de la création de la transaction');
        }
    };

    const handleDelete = async (item) => {
        if (confirm('Supprimer cette transaction ?')) {
            try {
                await transactionsAPI.delete(item.id);
                await filterTransactions();
            } catch (err) {
                console.error('Error deleting transaction:', err);
                setError(err.message || 'Erreur lors de la suppression de la transaction');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            salon_id: selectedSalon || '',
            hairdresser_id: '',
            service_id: '',
            price_salon: '',
            price_coiffeur: '',
            payment_method: 'cash'
        });
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
    };

    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getHairdresserName = (id) => {
        const h = hairdressers.find(h => h.id === id);
        return h ? `${h.first_name} ${h.last_name}` : 'Inconnu';
    };

    const getSalonName = (id) => {
        const s = salons.find(s => s.id === id);
        return s ? s.name : 'Inconnu';
    };

    // Calculate totals
    const totalSalon = transactions.reduce((sum, t) => sum + (t.price_salon || t.price || 0), 0);
    const totalCoiffeur = transactions.reduce((sum, t) => sum + (t.price_coiffeur || t.commission_amount || 0), 0);
    const totalCash = transactions.filter(t => t.payment_method === 'cash').reduce((sum, t) => sum + (t.price_salon || t.price || 0), 0);
    const totalCard = transactions.filter(t => t.payment_method === 'card').reduce((sum, t) => sum + (t.price_salon || t.price || 0), 0);

    const columns = [
        {
            header: 'Heure',
            width: '80px',
            render: (row) => (
                <span style={{
                    fontWeight: 500,
                    color: 'var(--color-text-muted)'
                }}>
                    {formatTime(row.service_date_time)}
                </span>
            )
        },
        {
            header: 'Service',
            render: (row) => (
                <div style={{ fontWeight: 500 }}>{row.service_name}</div>
            )
        },
        {
            header: 'Coiffeur',
            render: (row) => (
                <span style={{ color: 'var(--color-text-secondary)' }}>
                    {getHairdresserName(row.hairdresser_id)}
                </span>
            )
        },
        {
            header: 'Salon',
            render: (row) => (
                <span style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-muted)'
                }}>
                    {getSalonName(row.salon_id)}
                </span>
            )
        },
        {
            header: 'Paiement',
            render: (row) => (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)'
                }}>
                    {row.payment_method === 'cash' ? (
                        <span className="badge badge-success">
                            <Banknote size={12} />
                            Espèces
                        </span>
                    ) : (
                        <span className="badge badge-info">
                            <CreditCard size={12} />
                            Carte
                        </span>
                    )}
                </div>
            )
        },
        {
            header: 'Prix Salon',
            render: (row) => (
                <span style={{
                    fontWeight: 700,
                    color: 'var(--color-gold-600)'
                }}>
                    {formatCurrency(row.price_salon || row.price)}
                </span>
            )
        },
        {
            header: 'Part Coiffeur',
            render: (row) => (
                <span style={{
                    fontWeight: 600,
                    color: 'var(--color-primary-600)'
                }}>
                    {formatCurrency(row.price_coiffeur || row.commission_amount || 0)}
                </span>
            )
        },
        {
            header: '',
            width: '50px',
            render: (row) => (
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
                    style={{ color: 'var(--color-error)' }}
                >
                    <Trash2 size={16} />
                </button>
            )
        }
    ];

    if (loading) {
        return (
            <div className="animate-fadeIn">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Historique des Services</h1>
                        <p className="page-subtitle">Chargement...</p>
                    </div>
                </div>
                <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                    <p>Chargement des données...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            {error && (
                <div className="card" style={{
                    marginBottom: 'var(--space-4)',
                    padding: 'var(--space-4)',
                    backgroundColor: 'var(--color-error-light, #fee2e2)',
                    border: '1px solid var(--color-error)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)'
                }}>
                    <AlertCircle size={20} style={{ color: 'var(--color-error)' }} />
                    <span style={{ color: 'var(--color-error)' }}>{error}</span>
                    <button
                        className="btn btn-sm btn-secondary"
                        style={{ marginLeft: 'auto' }}
                        onClick={() => setError(null)}
                    >
                        Fermer
                    </button>
                </div>
            )}

            <div className="page-header">
                <div>
                    <h1 className="page-title">Historique des Services</h1>
                    <p className="page-subtitle">Enregistrez et suivez toutes vos prestations</p>
                </div>
                <button className="btn btn-accent" onClick={openCreateModal}>
                    <Plus size={18} />
                    Nouvelle Prestation
                </button>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    flexWrap: 'wrap'
                }}>
                    <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
                        <label className="form-label">Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
                        <label className="form-label">Salon</label>
                        <select
                            className="form-select"
                            value={selectedSalon}
                            onChange={(e) => setSelectedSalon(e.target.value)}
                        >
                            <option value="">Tous les salons</option>
                            {salons.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{
                        marginLeft: 'auto',
                        display: 'flex',
                        gap: 'var(--space-6)',
                        alignItems: 'center'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-muted)',
                                marginBottom: 'var(--space-1)'
                            }}>
                                Espèces
                            </div>
                            <div style={{
                                fontWeight: 600,
                                color: 'var(--color-success)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-1)'
                            }}>
                                <Banknote size={16} />
                                {formatCurrency(totalCash)}
                            </div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-muted)',
                                marginBottom: 'var(--space-1)'
                            }}>
                                Carte
                            </div>
                            <div style={{
                                fontWeight: 600,
                                color: 'var(--color-info)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-1)'
                            }}>
                                <CreditCard size={16} />
                                {formatCurrency(totalCard)}
                            </div>
                        </div>

                        <div style={{
                            textAlign: 'center',
                            padding: 'var(--space-3) var(--space-6)',
                            background: 'linear-gradient(135deg, var(--color-gold-100), var(--color-primary-50))',
                            borderRadius: 'var(--radius-xl)',
                            border: '1px solid var(--color-border)'
                        }}>
                            <div style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-muted)',
                                marginBottom: 'var(--space-1)'
                            }}>
                                Total Salon
                            </div>
                            <div style={{
                                fontWeight: 700,
                                fontSize: 'var(--font-size-lg)',
                                color: 'var(--color-gold-600)'
                            }}>
                                {formatCurrency(totalSalon)}
                            </div>
                        </div>

                        <div style={{
                            textAlign: 'center',
                            padding: 'var(--space-3) var(--space-6)',
                            background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-gold-50))',
                            borderRadius: 'var(--radius-xl)',
                            border: '1px solid var(--color-border)'
                        }}>
                            <div style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-muted)',
                                marginBottom: 'var(--space-1)'
                            }}>
                                Part Coiffeurs
                            </div>
                            <div style={{
                                fontWeight: 700,
                                fontSize: 'var(--font-size-lg)',
                                color: 'var(--color-primary-600)'
                            }}>
                                {formatCurrency(totalCoiffeur)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <DataTable
                    columns={columns}
                    data={transactions}
                    emptyMessage="Aucune prestation pour cette date"
                />
            </div>

            {/* Create Modal - Simplified without commission */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Nouvelle Prestation"
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
                            className="btn btn-accent"
                            onClick={handleSubmit}
                        >
                            Enregistrer
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
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
                    </div>

                    <div className="form-group">
                        <label className="form-label">Service *</label>
                        <select
                            className="form-select"
                            value={formData.service_id}
                            onChange={(e) => handleServiceChange(e.target.value)}
                            required
                        >
                            <option value="">Sélectionner un service</option>
                            {services.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.name} - {(s.price_salon || s.price || 0).toFixed(2)}€
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Prix Salon (€)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.price_salon}
                                onChange={(e) => setFormData({ ...formData, price_salon: e.target.value })}
                                min="0"
                                step="0.01"
                            />
                            <span className="form-hint">Prix facturé au client</span>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Part Coiffeur (€)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.price_coiffeur}
                                onChange={(e) => setFormData({ ...formData, price_coiffeur: e.target.value })}
                                min="0"
                                step="0.01"
                            />
                            <span className="form-hint">Montant versé au coiffeur</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Mode de paiement</label>
                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <button
                                type="button"
                                className={`btn ${formData.payment_method === 'cash' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setFormData({ ...formData, payment_method: 'cash' })}
                                style={{ flex: 1 }}
                            >
                                <Banknote size={18} />
                                Espèces
                            </button>
                            <button
                                type="button"
                                className={`btn ${formData.payment_method === 'card' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setFormData({ ...formData, payment_method: 'card' })}
                                style={{ flex: 1 }}
                            >
                                <CreditCard size={18} />
                                Carte
                            </button>
                        </div>
                    </div>

                    {/* Preview */}
                    {formData.price_salon && (
                        <div style={{
                            padding: 'var(--space-4)',
                            background: 'linear-gradient(135deg, var(--color-gold-50), var(--color-primary-50))',
                            borderRadius: 'var(--radius-lg)',
                            marginTop: 'var(--space-4)',
                            border: '1px solid var(--color-border)'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: 'var(--space-2)'
                            }}>
                                <span style={{ color: 'var(--color-text-muted)' }}>Prix Salon</span>
                                <span style={{ fontWeight: 600, color: 'var(--color-gold-600)' }}>
                                    {formatCurrency(formData.price_salon)}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: 'var(--space-2)'
                            }}>
                                <span style={{ color: 'var(--color-text-muted)' }}>Part Coiffeur</span>
                                <span style={{ fontWeight: 600, color: 'var(--color-primary-600)' }}>
                                    {formatCurrency(formData.price_coiffeur || 0)}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                paddingTop: 'var(--space-2)',
                                borderTop: '1px solid var(--color-border)'
                            }}>
                                <span style={{ fontWeight: 600 }}>Marge Salon</span>
                                <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                                    {formatCurrency((formData.price_salon || 0) - (formData.price_coiffeur || 0))}
                                </span>
                            </div>
                        </div>
                    )}
                </form>
            </Modal>
        </div>
    );
};

export default Transactions;
