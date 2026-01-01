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

const Presence = () => {
    // Data states
    const [hairdressers, setHairdressers] = useState([]);
    const [salons, setSalons] = useState([]);
    const [services, setServices] = useState([]);
    const [dailyServices, setDailyServices] = useState([]);
    
    // Filter states
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterSalonId, setFilterSalonId] = useState('');
    
    // UI states
    const [selectedHairdresser, setSelectedHairdresser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [expandedHairdresser, setExpandedHairdresser] = useState(null);
    
    // Form state
    const [serviceForm, setServiceForm] = useState({
        salon_id: '',
        service_id: '',
        payment_method: 'cash',
        service_date: new Date().toISOString().split('T')[0],
        quantity: 1
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

    const changeDate = (delta) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setDate(start.getDate() + delta);
        end.setDate(end.getDate() + delta);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const setToday = () => {
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
        setEndDate(today);
    };

    const setThisWeek = () => {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        setStartDate(monday.toISOString().split('T')[0]);
        setEndDate(sunday.toISOString().split('T')[0]);
    };

    const setThisMonth = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(lastDay.toISOString().split('T')[0]);
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
        const salonsWorked = [...new Set(services.map(s => s.salon_id))];
        return {
            count: services.length,
            totalSalon,
            totalCoiffeur,
            salonsWorked
        };
    };

    // Open modal to add a service
    const openServiceModal = (hairdresser) => {
        setSelectedHairdresser(hairdresser);
        setServiceForm({
            salon_id: filterSalonId || (salons.length > 0 ? salons[0].id : ''),
            service_id: services.length > 0 ? services[0].id : '',
            payment_method: 'cash',
            service_date: new Date().toISOString().split('T')[0],
            quantity: 1
        });
        setShowServiceModal(true);
    };

    // Add a service
    const handleAddService = async () => {
        try {
            const selectedService = services.find(s => s.id === serviceForm.service_id);
            if (!selectedService || !selectedHairdresser) return;

            const quantity = parseInt(serviceForm.quantity) || 1;
            const serviceData = {
                salon_id: serviceForm.salon_id,
                hairdresser_id: selectedHairdresser.id,
                service_id: serviceForm.service_id,
                service_name: selectedService.name,
                price_salon: selectedService.price_salon,
                price_coiffeur: selectedService.price_coiffeur,
                payment_method: serviceForm.payment_method,
                service_date_time: new Date(serviceForm.service_date + 'T' + new Date().toTimeString().slice(0, 8)).toISOString()
            };

            // Create multiple services based on quantity
            const promises = [];
            for (let i = 0; i < quantity; i++) {
                promises.push(transactionsAPI.create(serviceData));
            }
            await Promise.all(promises);

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
                    {/* Date Range */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <button className="btn btn-secondary btn-icon" onClick={() => changeDate(-1)}>
                            <ChevronLeft size={20} />
                        </button>

                        <div>
                            <label className="form-label" style={{ marginBottom: 4 }}>Du</label>
                            <input
                                type="date"
                                className="form-input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{ width: '150px' }}
                            />
                        </div>

                        <div>
                            <label className="form-label" style={{ marginBottom: 4 }}>Au</label>
                            <input
                                type="date"
                                className="form-input"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{ width: '150px' }}
                            />
                        </div>

                        <button className="btn btn-secondary btn-icon" onClick={() => changeDate(1)}>
                            <ChevronRight size={20} />
                        </button>
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

                    {/* Quick Filters */}
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button 
                            className={`btn btn-sm ${!isDateRange && startDate === new Date().toISOString().split('T')[0] ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={setToday}
                        >
                            Aujourd'hui
                        </button>
                        <button 
                            className="btn btn-ghost btn-sm"
                            onClick={setThisWeek}
                        >
                            Cette semaine
                        </button>
                        <button 
                            className="btn btn-ghost btn-sm"
                            onClick={setThisMonth}
                        >
                            Ce mois
                        </button>
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
                                {periodTotals.salon.toFixed(0)} €
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
                                {periodTotals.coiffeurs.toFixed(0)} €
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
                                            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                                                {h.first_name} {h.last_name}
                                            </div>
                                            <div style={{ 
                                                fontSize: 'var(--font-size-sm)', 
                                                color: 'var(--color-text-muted)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-3)',
                                                marginTop: 'var(--space-1)'
                                            }}>
                                                <span className="badge badge-success">{stats.count} services</span>
                                                {stats.salonsWorked.length > 1 && (
                                                    <span className="badge badge-purple">{stats.salonsWorked.length} salons</span>
                                                )}
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
                                                    {stats.totalSalon.toFixed(0)} €
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 2 }}>
                                                    Coiffeur
                                                </div>
                                                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-accent-400)' }}>
                                                    {stats.totalCoiffeur.toFixed(0)} €
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
                                                        <th style={{ padding: 'var(--space-2)' }}>Heure</th>
                                                        <th style={{ padding: 'var(--space-2)' }}>Salon</th>
                                                        <th style={{ padding: 'var(--space-2)' }}>Service</th>
                                                        <th style={{ padding: 'var(--space-2)' }}>Paiement</th>
                                                        <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>Salon</th>
                                                        <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>Coiffeur</th>
                                                        <th style={{ padding: 'var(--space-2)', width: 50 }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {services.map(s => (
                                                        <tr key={s.id} style={{ 
                                                            borderTop: '1px solid var(--color-border)',
                                                            fontSize: 'var(--font-size-sm)'
                                                        }}>
                                                            <td style={{ padding: 'var(--space-2)' }}>
                                                                {formatTime(s.service_date_time)}
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
                                                                {parseFloat(s.price_salon).toFixed(0)} €
                                                            </td>
                                                            <td style={{ padding: 'var(--space-2)', textAlign: 'right', color: 'var(--color-accent-400)', fontWeight: 600 }}>
                                                                {parseFloat(s.price_coiffeur).toFixed(0)} €
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
                                <div style={{ fontWeight: 500 }}>{h.first_name} {h.last_name}</div>
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
                title={`Ajouter un service - ${selectedHairdresser?.first_name} ${selectedHairdresser?.last_name}`}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowServiceModal(false)}>
                            Annuler
                        </button>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleAddService}
                            disabled={!serviceForm.salon_id || !serviceForm.service_id}
                        >
                            <Plus size={16} />
                            Ajouter
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
                    <label className="form-label">Service *</label>
                    <select
                        className="form-select"
                        value={serviceForm.service_id}
                        onChange={(e) => setServiceForm({ ...serviceForm, service_id: e.target.value })}
                    >
                        <option value="">Sélectionner un service</option>
                        {services.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.name} — Salon: {s.price_salon}€ | Coiffeur: {s.price_coiffeur}€
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Quantité</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setServiceForm({ ...serviceForm, quantity: Math.max(1, (serviceForm.quantity || 1) - 1) })}
                            style={{ width: 40, height: 40, padding: 0 }}
                        >
                            -
                        </button>
                        <input
                            type="number"
                            className="form-input"
                            value={serviceForm.quantity}
                            onChange={(e) => setServiceForm({ ...serviceForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                            min="1"
                            style={{ width: 80, textAlign: 'center', fontWeight: 600, fontSize: 'var(--font-size-lg)' }}
                        />
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setServiceForm({ ...serviceForm, quantity: (serviceForm.quantity || 1) + 1 })}
                            style={{ width: 40, height: 40, padding: 0 }}
                        >
                            +
                        </button>
                    </div>
                </div>

                {serviceForm.service_id && (
                    <div style={{
                        padding: 'var(--space-4)',
                        background: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: 'var(--space-4)'
                    }}>
                        {(() => {
                            const selectedService = services.find(s => s.id === serviceForm.service_id);
                            if (!selectedService) return null;
                            const qty = serviceForm.quantity || 1;
                            const totalSalon = selectedService.price_salon * qty;
                            const totalCoiffeur = selectedService.price_coiffeur * qty;
                            return (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                                                Prix Salon {qty > 1 ? `(×${qty})` : ''}
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-success)' }}>
                                                {totalSalon} €
                                            </div>
                                            {qty > 1 && (
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                                    {selectedService.price_salon}€ × {qty}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                                                Part Coiffeur {qty > 1 ? `(×${qty})` : ''}
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-accent-400)' }}>
                                                {totalCoiffeur} €
                                            </div>
                                            {qty > 1 && (
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                                    {selectedService.price_coiffeur}€ × {qty}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {qty > 1 && (
                                        <div style={{ 
                                            marginTop: 'var(--space-3)', 
                                            padding: 'var(--space-2)', 
                                            background: 'var(--color-warning-bg)', 
                                            borderRadius: 'var(--radius-md)',
                                            textAlign: 'center',
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-warning)'
                                        }}>
                                            {qty} services seront créés
                                        </div>
                                    )}
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
        </div>
    );
};

export default Presence;
