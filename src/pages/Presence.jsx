import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Building2,
    User,
    Check,
    X,
    ChevronLeft,
    ChevronRight,
    Users,
    Clock,
    AlertCircle,
    Plus,
    Scissors,
    Euro,
    TrendingUp,
    Trash2,
    CreditCard,
    Banknote,
    Eye,
    EyeOff,
    Filter,
    Search
} from 'lucide-react';
import { Modal } from '../components/UI';
import { transactionsAPI, hairdressersAPI, salonsAPI, servicesAPI } from '../services/api';
import { useDateFilter } from '../context/DateFilterContext';

const Presence = () => {
    // Global date filter
    const { startDate, endDate } = useDateFilter();
    
    // Data states
    const [hairdressers, setHairdressers] = useState([]);
    const [salons, setSalons] = useState([]);
    const [services, setServices] = useState([]);
    const [dailyServices, setDailyServices] = useState([]);
    
    // Filter states
    const [filterSalonId, setFilterSalonId] = useState('');
    
    // UI states
    const [selectedHairdresser, setSelectedHairdresser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [expandedHairdresser, setExpandedHairdresser] = useState(null);

    // M-1 modal states
    const [showM1Modal, setShowM1Modal] = useState(false);
    const [m1Hairdresser, setM1Hairdresser] = useState(null);
    const [m1Data, setM1Data] = useState([]);
    const [m1Loading, setM1Loading] = useState(false);
    
    // Form state
    const [serviceForm, setServiceForm] = useState({
        salon_id: '',
        payment_method: 'cash',
        service_date: new Date().toISOString().split('T')[0],
        selectedServices: {} // { service_id: quantity }
    });

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            loadDailyServices();
        }
    }, [startDate, endDate, filterSalonId]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [hairdressersData, salonsData, servicesData] = await Promise.all([
                hairdressersAPI.getActive(),
                salonsAPI.getActive(),
                servicesAPI.getActive()
            ]);
            setHairdressers(hairdressersData);
            setSalons(salonsData);
            setServices(servicesData);
            await loadDailyServices();
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const loadDailyServices = async () => {
        try {
            const filters = {
                start_date: startDate,
                end_date: endDate
            };
            if (filterSalonId) {
                filters.salon_id = filterSalonId;
            }
            const data = await transactionsAPI.getAll(filters);
            setDailyServices(data);
        } catch (err) {
            console.error('Error loading daily services:', err);
        }
    };

    const isDateRange = startDate !== endDate;

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getInitials = (h) => {
        return `${h.first_name[0]}${h.last_name[0]}`.toUpperCase();
    };

    // Get services for a specific hairdresser on selected date
    const getHairdresserServices = (hairdresserId) => {
        return dailyServices.filter(s => s.hairdresser_id === hairdresserId);
    };

    // Calculate stats for a hairdresser
    const getHairdresserStats = (hairdresserId) => {
        const services = getHairdresserServices(hairdresserId);
        const totalSalon = services.reduce((sum, s) => sum + parseFloat(s.price_salon || 0), 0);
        const totalCoiffeur = services.reduce((sum, s) => sum + parseFloat(s.price_coiffeur || 0), 0);
        const totalCBSalon = services.filter(s => s.payment_method === 'card').reduce((sum, s) => sum + parseFloat(s.price_salon || 0), 0);
        const totalEspecesSalon = services.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + parseFloat(s.price_salon || 0), 0);
        const salonsWorked = [...new Set(services.map(s => s.salon_id))];
        return {
            count: services.length,
            totalSalon,
            totalCoiffeur,
            totalCBSalon,
            totalEspecesSalon,
            salonsWorked
        };
    };

    // Open monthly recap modal for a hairdresser
    const openM1Modal = async (hairdresser) => {
        setM1Hairdresser(hairdresser);
        setShowM1Modal(true);
        setM1Loading(true);
        try {
            // Use the full selected period from sidebar
            const filters = {
                start_date: startDate,
                end_date: endDate
            };
            const data = await transactionsAPI.getByHairdresser(hairdresser.id, filters);
            setM1Data(data);
        } catch (err) {
            console.error('Error loading monthly data:', err);
            setM1Data([]);
        } finally {
            setM1Loading(false);
        }
    };

    // Build M-1 daily breakdown grouped by salon then date
    const getM1DailyBreakdown = () => {
        const grouped = {};
        m1Data.forEach(s => {
            const date = new Date(s.service_date_time).toISOString().split('T')[0];
            const salonName = getSalonName(s.salon_id);
            const key = `${salonName}||${date}`;
            if (!grouped[key]) {
                grouped[key] = { salonName, date, caEspeces: 0, caCB: 0, caGlobal: 0 };
            }
            const price = parseFloat(s.price_salon || 0);
            grouped[key].caGlobal += price;
            if (s.payment_method === 'cash') {
                grouped[key].caEspeces += price;
            } else {
                grouped[key].caCB += price;
            }
        });
        return Object.values(grouped).sort((a, b) => {
            if (a.salonName !== b.salonName) return a.salonName.localeCompare(b.salonName);
            return a.date.localeCompare(b.date);
        });
    };

    // Open modal to add a service
    const openServiceModal = (hairdresser) => {
        setSelectedHairdresser(hairdresser);
        const lastDate = localStorage.getItem('lastServiceDate') || new Date().toISOString().split('T')[0];
        setServiceForm({
            salon_id: filterSalonId || (salons.length > 0 ? salons[0].id : ''),
            payment_method: 'cash',
            service_date: lastDate,
            selectedServices: {}
        });
        setShowServiceModal(true);
    };

    // Update service quantity in selection
    const updateServiceQuantity = (serviceId, delta) => {
        setServiceForm(prev => {
            const current = prev.selectedServices[serviceId] || 0;
            const newQty = Math.max(0, current + delta);
            const newSelected = { ...prev.selectedServices };
            if (newQty === 0) {
                delete newSelected[serviceId];
            } else {
                newSelected[serviceId] = newQty;
            }
            return { ...prev, selectedServices: newSelected };
        });
    };

    // Get total counts for selected services
    const getSelectedServicesTotals = () => {
        let totalSalon = 0;
        let totalCoiffeur = 0;
        let totalCount = 0;
        Object.entries(serviceForm.selectedServices).forEach(([serviceId, qty]) => {
            const service = services.find(s => s.id === serviceId);
            if (service && qty > 0) {
                totalSalon += service.price_salon * qty;
                totalCoiffeur += service.price_coiffeur * qty;
                totalCount += qty;
            }
        });
        return { totalSalon, totalCoiffeur, totalCount };
    };

    // Add a service
    const handleAddService = async () => {
        try {
            if (!selectedHairdresser || Object.keys(serviceForm.selectedServices).length === 0) return;

            const promises = [];
            const serviceDateTime = new Date(serviceForm.service_date + 'T' + new Date().toTimeString().slice(0, 8)).toISOString();

            Object.entries(serviceForm.selectedServices).forEach(([serviceId, quantity]) => {
                const service = services.find(s => s.id === serviceId);
                if (service && quantity > 0) {
                    const serviceData = {
                        salon_id: serviceForm.salon_id,
                        hairdresser_id: selectedHairdresser.id,
                        service_id: serviceId,
                        service_name: service.name,
                        price_salon: service.price_salon,
                        price_coiffeur: service.price_coiffeur,
                        payment_method: serviceForm.payment_method,
                        service_date_time: serviceDateTime
                    };
                    for (let i = 0; i < quantity; i++) {
                        promises.push(transactionsAPI.create(serviceData));
                    }
                }
            });

            await Promise.all(promises);
            localStorage.setItem('lastServiceDate', serviceForm.service_date);
            setShowServiceModal(false);
            await loadDailyServices();
        } catch (err) {
            setError('Erreur lors de l\'ajout du service');
            console.error(err);
        }
    };

    // Delete a service
    const handleDeleteService = async (serviceId) => {
        if (confirm('Supprimer cette prestation ?')) {
            try {
                await transactionsAPI.delete(serviceId);
                await loadDailyServices();
            } catch (err) {
                setError('Erreur lors de la suppression');
                console.error(err);
            }
        }
    };

    // Toggle expanded view for a hairdresser
    const toggleExpanded = (hairdresserId) => {
        setExpandedHairdresser(expandedHairdresser === hairdresserId ? null : hairdresserId);
    };

    // Get salon name by ID
    const getSalonName = (salonId) => {
        const salon = salons.find(s => s.id === salonId);
        return salon ? salon.name : '—';
    };

    // Period totals
    const periodTotals = {
        services: dailyServices.length,
        salon: dailyServices.reduce((sum, s) => sum + parseFloat(s.price_salon || 0), 0),
        coiffeurs: dailyServices.reduce((sum, s) => sum + parseFloat(s.price_coiffeur || 0), 0)
    };

    // Get filtered salon name
    const getFilteredSalonName = () => {
        if (!filterSalonId) return 'Tous les salons';
        const salon = salons.find(s => s.id === filterSalonId);
        return salon ? salon.name : 'Tous les salons';
    };

    // Hairdressers who worked today
    const activeHairdressers = hairdressers.filter(h => getHairdresserServices(h.id).length > 0);
    const inactiveHairdressers = hairdressers.filter(h => getHairdresserServices(h.id).length === 0);

    if (loading) {
        return (
            <div className="animate-fadeIn" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            {error && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-4)',
                    marginBottom: 'var(--space-4)',
                    background: 'var(--color-error-bg)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--color-error)'
                }}>
                    <AlertCircle size={20} />
                    {error}
                    <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>×</button>
                </div>
            )}

            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Journal des Services</h1>
                    <p className="page-subtitle">Enregistrez les prestations quotidiennes par coiffeur</p>
                </div>
            </div>

            {/* Filters Card */}
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                {/* Filters Row */}
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    flexWrap: 'wrap',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-4)'
                }}>
                    {/* Period display */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-2) var(--space-3)',
                        background: 'var(--color-primary-50)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-primary-700)',
                        fontWeight: 500,
                        fontSize: 'var(--font-size-sm)'
                    }}>
                        <Calendar size={16} />
                        <span>
                            {new Date(startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {startDate !== endDate && ` - ${new Date(endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        </span>
                    </div>

                    {/* Salon Filter */}
                    <div>
                        <label className="form-label" style={{ marginBottom: 4 }}>
                            <Building2 size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            Salon
                        </label>
                        <select
                            className="form-select"
                            value={filterSalonId}
                            onChange={(e) => setFilterSalonId(e.target.value)}
                            style={{ minWidth: '180px' }}
                        >
                            <option value="">Tous les salons</option>
                            {salons.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Summary Row */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 'var(--space-4)',
                    paddingTop: 'var(--space-4)',
                    borderTop: '1px solid var(--color-border)'
                }}>
                    {/* Period Info */}
                    <div style={{ 
                        fontSize: 'var(--font-size-sm)', 
                        color: 'var(--color-text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)'
                    }}>
                        <Filter size={16} />
                        <span>
                            {isDateRange 
                                ? `Du ${formatDate(startDate)} au ${formatDate(endDate)}`
                                : formatDate(startDate)
                            }
                            {filterSalonId && ` • ${getFilteredSalonName()}`}
                        </span>
                    </div>

                    {/* Period Totals */}
                    <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                        <div style={{
                            textAlign: 'center',
                            padding: 'var(--space-3) var(--space-5)',
                            background: 'rgba(139, 92, 246, 0.1)',
                            borderRadius: 'var(--radius-lg)'
                        }}>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-primary-500)' }}>
                                {periodTotals.services}
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Services</div>
                        </div>
                        <div style={{
                            textAlign: 'center',
                            padding: 'var(--space-3) var(--space-5)',
                            background: 'rgba(34, 197, 94, 0.1)',
                            borderRadius: 'var(--radius-lg)'
                        }}>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-success)' }}>
                                {periodTotals.salon.toFixed(2)} €
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Salon</div>
                        </div>
                        <div style={{
                            textAlign: 'center',
                            padding: 'var(--space-3) var(--space-5)',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: 'var(--radius-lg)'
                        }}>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-accent-400)' }}>
                                {periodTotals.coiffeurs.toFixed(2)} €
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Coiffeurs</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Hairdressers (with services today) */}
            {activeHairdressers.length > 0 && (
                <div style={{ marginBottom: 'var(--space-6)' }}>
                    <h3 style={{ 
                        fontSize: 'var(--font-size-lg)', 
                        fontWeight: 600, 
                        marginBottom: 'var(--space-4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)'
                    }}>
                        <Users size={20} style={{ color: 'var(--color-success)' }} />
                        Coiffeurs actifs ({activeHairdressers.length})
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        {activeHairdressers.map(h => {
                            const stats = getHairdresserStats(h.id);
                            const services = getHairdresserServices(h.id);
                            const isExpanded = expandedHairdresser === h.id;

                            return (
                                <div key={h.id} className="card" style={{ 
                                    borderLeft: '4px solid var(--color-success)',
                                    overflow: 'hidden'
                                }}>
                                    {/* Hairdresser Header */}
                                    <div 
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-4)',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => toggleExpanded(h.id)}
                                    >
                                        {/* Avatar */}
                                        <div style={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 'var(--radius-full)',
                                            background: 'linear-gradient(135deg, var(--color-success), #059669)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontWeight: 700,
                                            fontSize: 'var(--font-size-lg)',
                                            flexShrink: 0
                                        }}>
                                            {getInitials(h)}
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                                                    {h.first_name} {h.last_name}
                                                </span>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={(e) => { e.stopPropagation(); openM1Modal(h); }}
                                                    style={{ color: 'var(--color-primary-500)', fontSize: 'var(--font-size-xs)', padding: '2px 8px', border: '1px solid var(--color-primary-200)', borderRadius: 'var(--radius-md)' }}
                                                    title="Voir le récap du mois"
                                                >
                                                    <Calendar size={12} /> M
                                                </button>
                                            </div>
                                            <div style={{ 
                                                fontSize: 'var(--font-size-sm)', 
                                                color: 'var(--color-text-muted)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-3)',
                                                marginTop: 'var(--space-1)',
                                                flexWrap: 'wrap'
                                            }}>
                                                <span className="badge badge-success">{stats.count} services</span>
                                                {stats.salonsWorked.length > 1 && (
                                                    <span className="badge badge-purple">{stats.salonsWorked.length} salons</span>
                                                )}
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-accent-400)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                                    <CreditCard size={14} /> CB: {stats.totalCBSalon.toFixed(2)} €
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-success)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                                    <Banknote size={14} /> Espèces: {stats.totalEspecesSalon.toFixed(2)} €
                                                </span>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div style={{ 
                                            display: 'flex', 
                                            gap: 'var(--space-6)',
                                            alignItems: 'center'
                                        }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 2 }}>
                                                    Salon
                                                </div>
                                                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-success)' }}>
                                                    {stats.totalSalon.toFixed(2)} €
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 2 }}>
                                                    Coiffeur
                                                </div>
                                                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-accent-400)' }}>
                                                    {stats.totalCoiffeur.toFixed(2)} €
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={(e) => { e.stopPropagation(); openServiceModal(h); }}
                                            >
                                                <Plus size={16} />
                                                Service
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={(e) => { e.stopPropagation(); toggleExpanded(h.id); }}
                                            >
                                                {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Services List (expanded) */}
                                    {isExpanded && (
                                        <div style={{ 
                                            marginTop: 'var(--space-4)',
                                            paddingTop: 'var(--space-4)',
                                            borderTop: '1px solid var(--color-border)'
                                        }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ 
                                                        fontSize: 'var(--font-size-xs)', 
                                                        color: 'var(--color-text-muted)',
                                                        textAlign: 'left'
                                                    }}>
                                                        <th style={{ padding: 'var(--space-2)' }}>Date du service</th>
                                                        <th style={{ padding: 'var(--space-2)' }}>Salon</th>
                                                        <th style={{ padding: 'var(--space-2)' }}>Service</th>
                                                        <th style={{ padding: 'var(--space-2)' }}>Paiement</th>
                                                        <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>Salon</th>
                                                        <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>Coiffeur</th>
                                                        <th style={{ padding: 'var(--space-2)', width: 50 }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {getHairdresserServices(h.id).map(s => (
                                                        <tr key={s.id} style={{ 
                                                            borderTop: '1px solid var(--color-border)',
                                                            fontSize: 'var(--font-size-sm)'
                                                        }}>
                                                            <td style={{ padding: 'var(--space-2)' }}>
                                                                {new Date(s.service_date_time).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                            </td>
                                                            <td style={{ padding: 'var(--space-2)' }}>
                                                                <span className="badge" style={{ background: 'var(--color-bg-tertiary)' }}>
                                                                    {getSalonName(s.salon_id).split(' ').pop()}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: 'var(--space-2)', fontWeight: 500 }}>
                                                                {s.service_name}
                                                            </td>
                                                            <td style={{ padding: 'var(--space-2)' }}>
                                                                {s.payment_method === 'card' ? (
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-accent-400)' }}>
                                                                        <CreditCard size={14} /> CB
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-success)' }}>
                                                                        <Banknote size={14} /> Espèces
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: 'var(--space-2)', textAlign: 'right', color: 'var(--color-success)', fontWeight: 600 }}>
                                                                {parseFloat(s.price_salon).toFixed(2)} €
                                                            </td>
                                                            <td style={{ padding: 'var(--space-2)', textAlign: 'right', color: 'var(--color-accent-400)', fontWeight: 600 }}>
                                                                {parseFloat(s.price_coiffeur).toFixed(2)} €
                                                            </td>
                                                            <td style={{ padding: 'var(--space-2)' }}>
                                                                <button
                                                                    className="btn btn-ghost btn-sm"
                                                                    onClick={() => handleDeleteService(s.id)}
                                                                    style={{ color: 'var(--color-error)', padding: 4 }}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Inactive Hairdressers (no services today) */}
            <div>
                <h3 style={{ 
                    fontSize: 'var(--font-size-lg)', 
                    fontWeight: 600, 
                    marginBottom: 'var(--space-4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)'
                }}>
                    <Users size={20} style={{ color: 'var(--color-text-muted)' }} />
                    Autres coiffeurs ({inactiveHairdressers.length})
                </h3>

                <div className="grid grid-auto" style={{ gap: 'var(--space-3)' }}>
                    {inactiveHairdressers.map(h => (
                        <div 
                            key={h.id} 
                            className="card"
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 'var(--space-3)',
                                padding: 'var(--space-3) var(--space-4)',
                                opacity: 0.7
                            }}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 'var(--radius-full)',
                                background: 'linear-gradient(135deg, var(--color-primary-300), var(--color-gold-300))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: 'var(--font-size-sm)',
                                flexShrink: 0
                            }}>
                                {getInitials(h)}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                    <span style={{ fontWeight: 500 }}>{h.first_name} {h.last_name}</span>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => openM1Modal(h)}
                                        style={{ color: 'var(--color-primary-500)', fontSize: 'var(--font-size-xs)', padding: '2px 8px', border: '1px solid var(--color-primary-200)', borderRadius: 'var(--radius-md)' }}
                                        title="Voir le récap du mois"
                                    >
                                        <Calendar size={12} /> M
                                    </button>
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                    Aucun service
                                </div>
                            </div>

                            {/* Add button */}
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => openServiceModal(h)}
                            >
                                <Plus size={14} />
                                Service
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Service Modal */}
            <Modal
                isOpen={showServiceModal}
                onClose={() => setShowServiceModal(false)}
                title={`Ajouter des services - ${selectedHairdresser?.first_name} ${selectedHairdresser?.last_name}`}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowServiceModal(false)}>
                            Annuler
                        </button>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleAddService}
                            disabled={!serviceForm.salon_id || Object.keys(serviceForm.selectedServices).length === 0}
                        >
                            <Plus size={16} />
                            Ajouter ({getSelectedServicesTotals().totalCount} services)
                        </button>
                    </>
                }
            >
                <div className="form-group">
                    <label className="form-label">Date du service *</label>
                    <input
                        type="date"
                        className="form-input"
                        value={serviceForm.service_date}
                        onChange={(e) => setServiceForm({ ...serviceForm, service_date: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Salon *</label>
                    <select
                        className="form-select"
                        value={serviceForm.salon_id}
                        onChange={(e) => setServiceForm({ ...serviceForm, salon_id: e.target.value })}
                    >
                        <option value="">Sélectionner un salon</option>
                        {salons.map(s => (
                            <option key={s.id} value={s.id}>{s.name} - {s.city}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Services *</label>
                    <div style={{ 
                        maxHeight: '250px', 
                        overflowY: 'auto', 
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-2)'
                    }}>
                        {services.map(s => {
                            const qty = serviceForm.selectedServices[s.id] || 0;
                            return (
                                <div 
                                    key={s.id} 
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between',
                                        padding: 'var(--space-3)',
                                        borderRadius: 'var(--radius-md)',
                                        background: qty > 0 ? 'var(--color-primary-50)' : 'transparent',
                                        marginBottom: 'var(--space-2)',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{s.name}</div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                            Salon: {s.price_salon}€ | Coiffeur: {s.price_coiffeur}€
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => updateServiceQuantity(s.id, -1)}
                                            disabled={qty === 0}
                                            style={{ width: 32, height: 32, padding: 0, fontSize: 'var(--font-size-lg)' }}
                                        >
                                            −
                                        </button>
                                        <span style={{ 
                                            width: 32, 
                                            textAlign: 'center', 
                                            fontWeight: 600,
                                            color: qty > 0 ? 'var(--color-primary-500)' : 'var(--color-text-muted)'
                                        }}>
                                            {qty}
                                        </span>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => updateServiceQuantity(s.id, 1)}
                                            style={{ width: 32, height: 32, padding: 0, fontSize: 'var(--font-size-lg)' }}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {Object.keys(serviceForm.selectedServices).length > 0 && (
                    <div style={{
                        padding: 'var(--space-4)',
                        background: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: 'var(--space-4)'
                    }}>
                        {(() => {
                            const totals = getSelectedServicesTotals();
                            return (
                                <>
                                    <div style={{ 
                                        fontSize: 'var(--font-size-sm)', 
                                        fontWeight: 600, 
                                        marginBottom: 'var(--space-3)',
                                        color: 'var(--color-text-muted)'
                                    }}>
                                        Résumé ({totals.totalCount} service{totals.totalCount > 1 ? 's' : ''})
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                                                Prix Salon
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-success)' }}>
                                                {totals.totalSalon} €
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                                                Part Coiffeur
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-accent-400)' }}>
                                                {totals.totalCoiffeur} €
                                            </div>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Mode de paiement</label>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <button
                            type="button"
                            className={`btn ${serviceForm.payment_method === 'cash' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setServiceForm({ ...serviceForm, payment_method: 'cash' })}
                            style={{ flex: 1 }}
                        >
                            <Banknote size={18} />
                            Espèces
                        </button>
                        <button
                            type="button"
                            className={`btn ${serviceForm.payment_method === 'card' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setServiceForm({ ...serviceForm, payment_method: 'card' })}
                            style={{ flex: 1 }}
                        >
                            <CreditCard size={18} />
                            Carte
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Monthly Detail Modal */}
            <Modal
                isOpen={showM1Modal}
                onClose={() => setShowM1Modal(false)}
                title={`Récap Mensuel — ${m1Hairdresser?.first_name} ${m1Hairdresser?.last_name}`}
                size="lg"
            >
                {m1Loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
                        <div className="spinner" />
                    </div>
                ) : m1Data.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
                        Aucun service pour ce mois.
                    </div>
                ) : (() => {
                    const breakdown = getM1DailyBreakdown();
                    const totals = breakdown.reduce((acc, row) => ({
                        caEspeces: acc.caEspeces + row.caEspeces,
                        caCB: acc.caCB + row.caCB,
                        caGlobal: acc.caGlobal + row.caGlobal
                    }), { caEspeces: 0, caCB: 0, caGlobal: 0 });
                    const m1MonthLabel = new Date(startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                        + ' — ' + new Date(endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                    return (
                        <div>
                            <div style={{ 
                                marginBottom: 'var(--space-4)', 
                                padding: 'var(--space-3)', 
                                background: 'var(--color-bg-secondary)', 
                                borderRadius: 'var(--radius-lg)',
                                textAlign: 'center',
                                textTransform: 'capitalize'
                            }}>
                                <strong>{m1MonthLabel}</strong> — {m1Data.length} service{m1Data.length > 1 ? 's' : ''}
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ 
                                            fontSize: 'var(--font-size-xs)', 
                                            color: 'var(--color-text-muted)',
                                            textAlign: 'left',
                                            borderBottom: '2px solid var(--color-border)'
                                        }}>
                                            <th style={{ padding: 'var(--space-2) var(--space-3)' }}>Salon</th>
                                            <th style={{ padding: 'var(--space-2) var(--space-3)' }}>Date</th>
                                            <th style={{ padding: 'var(--space-2) var(--space-3)' }}>Coiffeur</th>
                                            <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>CA Espèces</th>
                                            <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>CA CB</th>
                                            <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>CA Global</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {breakdown.map((row, idx) => (
                                            <tr key={idx} style={{ 
                                                borderTop: '1px solid var(--color-border)',
                                                fontSize: 'var(--font-size-sm)'
                                            }}>
                                                <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                                                    <span className="badge" style={{ background: 'var(--color-bg-tertiary)' }}>
                                                        {row.salonName}
                                                    </span>
                                                </td>
                                                <td style={{ padding: 'var(--space-2) var(--space-3)', fontWeight: 500 }}>
                                                    {new Date(row.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                </td>
                                                <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                                                    {m1Hairdresser?.first_name} {m1Hairdresser?.last_name}
                                                </td>
                                                <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', color: 'var(--color-success)', fontWeight: 600 }}>
                                                    {row.caEspeces.toFixed(2)} €
                                                </td>
                                                <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', color: 'var(--color-accent-400)', fontWeight: 600 }}>
                                                    {row.caCB.toFixed(2)} €
                                                </td>
                                                <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontWeight: 700 }}>
                                                    {row.caGlobal.toFixed(2)} €
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ 
                                            borderTop: '2px solid var(--color-border)',
                                            fontWeight: 700,
                                            fontSize: 'var(--font-size-sm)'
                                        }}>
                                            <td colSpan={3} style={{ padding: 'var(--space-3)', textAlign: 'right' }}>TOTAL</td>
                                            <td style={{ padding: 'var(--space-3)', textAlign: 'right', color: 'var(--color-success)' }}>
                                                {totals.caEspeces.toFixed(2)} €
                                            </td>
                                            <td style={{ padding: 'var(--space-3)', textAlign: 'right', color: 'var(--color-accent-400)' }}>
                                                {totals.caCB.toFixed(2)} €
                                            </td>
                                            <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                                                {totals.caGlobal.toFixed(2)} €
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
};

export default Presence;
