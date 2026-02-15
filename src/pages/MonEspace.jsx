import React, { useState, useEffect, useCallback } from 'react';
import {
    Euro,
    Scissors,
    Calendar,
    TrendingUp,
    Clock,
    CreditCard,
    Banknote,
    User,
    AlertCircle,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    Wifi,
    WifiOff,
    Download,
    LogOut,
    Edit2,
    Save,
    X,
    Wrench
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import {
    transactionsAPI,
    assignmentsAPI,
    salonsAPI,
    hairdressersAPI,
    equipmentPurchasesAPI
} from '../services/api';

const MonEspace = () => {
    const { user, logout } = useAuth();
    const [filterMonth, setFilterMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [stats, setStats] = useState({
        todayEarnings: 0,
        weekEarnings: 0,
        monthEarnings: 0,
        todayServices: 0,
        monthServices: 0
    });
    const [monthTransactions, setMonthTransactions] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [weeklyData, setWeeklyData] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [salons, setSalons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showAllTransactions, setShowAllTransactions] = useState(false);
    const [installPrompt, setInstallPrompt] = useState(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    
    // RIB editing state
    const [hairdresserData, setHairdresserData] = useState(null);
    const [editingRib, setEditingRib] = useState(false);
    const [ribForm, setRibForm] = useState({ rib_1: '', rib_2: '' });
    const [savingRib, setSavingRib] = useState(false);

    // Equipment purchases state
    const [equipmentPurchases, setEquipmentPurchases] = useState([]);
    const [equipmentTotal, setEquipmentTotal] = useState(0);

    // PWA Install prompt
    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
            setShowInstallBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    // Online/Offline detection
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (user?.hairdresserId) {
            loadData();
        }
    }, [user, filterMonth]);

    const changeMonth = (delta) => {
        const [year, month] = filterMonth.split('-').map(Number);
        const newDate = new Date(year, month - 1 + delta, 1);
        setFilterMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
        setShowAllTransactions(false);
    };

    const formatMonthLabel = (monthStr) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    };

    const isCurrentMonth = () => {
        const now = new Date();
        const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return filterMonth === current;
    };

    const loadData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            // Get assignments
            const assigns = await assignmentsAPI.getByHairdresser(user.hairdresserId);
            setAssignments(assigns.filter(a => a.is_active));

            // Get salons for lookup
            const salonsData = await salonsAPI.getAll();
            setSalons(salonsData);

            // Get hairdresser data (for RIB)
            const hairdresser = await hairdressersAPI.getById(user.hairdresserId);
            setHairdresserData(hairdresser);
            setRibForm({ rib_1: hairdresser.rib_1 || '', rib_2: hairdresser.rib_2 || '' });

            // Get all transactions for this hairdresser
            const allTransactions = await transactionsAPI.getByHairdresser(user.hairdresserId);

            // Calculate today's stats
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const todayTx = allTransactions.filter(t => {
                const d = new Date(t.service_date_time);
                return d >= today && d < tomorrow;
            });

            // This week
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay() + 1);
            const weekTx = allTransactions.filter(t => {
                const d = new Date(t.service_date_time);
                return d >= weekStart && d < tomorrow;
            });

            // Selected month filter
            const [filterYear, filterMon] = filterMonth.split('-').map(Number);
            const monthStart = new Date(filterYear, filterMon - 1, 1);
            const monthEnd = new Date(filterYear, filterMon, 1);
            const monthTx = allTransactions.filter(t => {
                const d = new Date(t.service_date_time);
                return d >= monthStart && d < monthEnd;
            });

            // Helper function to safely get earnings from transaction
            const getEarnings = (t) => {
                const value = parseFloat(t.price_coiffeur) || parseFloat(t.commission_amount) || 0;
                return isNaN(value) ? 0 : value;
            };

            setStats({
                todayEarnings: todayTx.reduce((sum, t) => sum + getEarnings(t), 0),
                weekEarnings: weekTx.reduce((sum, t) => sum + getEarnings(t), 0),
                monthEarnings: monthTx.reduce((sum, t) => sum + getEarnings(t), 0),
                todayServices: todayTx.length,
                monthServices: monthTx.length
            });

            // Month transactions sorted by date
            const sortedMonthTx = [...monthTx].sort((a, b) =>
                new Date(b.service_date_time) - new Date(a.service_date_time)
            );
            setMonthTransactions(sortedMonthTx);
            setRecentTransactions(sortedMonthTx.slice(0, 20));

            // Chart data for selected month (daily breakdown)
            const chartData = [];
            const daysInMonth = new Date(filterYear, filterMon, 0).getDate();
            
            // Group transactions by day for the selected month
            for (let day = 1; day <= daysInMonth; day++) {
                const dayStart = new Date(filterYear, filterMon - 1, day);
                const dayEnd = new Date(filterYear, filterMon - 1, day + 1);
                
                const dayTx = monthTx.filter(t => {
                    const d = new Date(t.service_date_time);
                    return d >= dayStart && d < dayEnd;
                });

                if (dayTx.length > 0 || day === 1 || day === daysInMonth || day % 7 === 0) {
                    chartData.push({
                        label: String(day),
                        fullDate: dayStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                        earnings: dayTx.reduce((sum, t) => sum + getEarnings(t), 0),
                        services: dayTx.length
                    });
                }
            }
            setWeeklyData(chartData);

            // Load equipment purchases for this month
            try {
                const equipData = await equipmentPurchasesAPI.getByHairdresser(user.hairdresserId, {
                    month: filterMon,
                    year: filterYear
                });
                setEquipmentPurchases(equipData);
                const total = equipData.reduce((sum, eq) => sum + (parseFloat(eq.amount) || 0), 0);
                setEquipmentTotal(total);
            } catch (equipErr) {
                console.log('Equipment load error:', equipErr);
                setEquipmentPurchases([]);
                setEquipmentTotal(0);
            }

            // Cache data for offline use
            try {
                localStorage.setItem('coiffeur_stats', JSON.stringify({
                    stats: {
                        todayEarnings: todayTx.reduce((sum, t) => sum + getEarnings(t), 0),
                        weekEarnings: weekTx.reduce((sum, t) => sum + getEarnings(t), 0),
                        monthEarnings: monthTx.reduce((sum, t) => sum + getEarnings(t), 0),
                        todayServices: todayTx.length,
                        monthServices: monthTx.length
                    },
                    weeklyData: chartData,
                    monthTransactions: sortedMonthTx.slice(0, 20),
                    filterMonth: filterMonth,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.log('Cache error:', e);
            }

        } catch (err) {
            console.error('Error loading data:', err);
            
            // Try to load from cache
            try {
                const cached = localStorage.getItem('coiffeur_stats');
                if (cached) {
                    const data = JSON.parse(cached);
                    setStats(data.stats);
                    setWeeklyData(data.weeklyData);
                    setMonthTransactions(data.monthTransactions || []);
                    setRecentTransactions(data.monthTransactions || []);
                    setError('Données hors ligne (dernière mise à jour: ' + new Date(data.timestamp).toLocaleString('fr-FR') + ')');
                } else {
                    setError(err.message || 'Erreur lors du chargement des données');
                }
            } catch (e) {
                setError(err.message || 'Erreur lors du chargement des données');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, filterMonth]);

    const handleRefresh = () => {
        loadData(true);
    };

    const handleInstall = async () => {
        if (installPrompt) {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowInstallBanner(false);
            }
            setInstallPrompt(null);
        }
    };

    const handleSaveRib = async () => {
        try {
            setSavingRib(true);
            await hairdressersAPI.updateRib(user.hairdresserId, ribForm);
            setHairdresserData({ ...hairdresserData, ...ribForm });
            setEditingRib(false);
        } catch (err) {
            setError('Erreur lors de la sauvegarde du RIB');
        } finally {
            setSavingRib(false);
        }
    };

    const handleCancelRibEdit = () => {
        setRibForm({ rib_1: hairdresserData?.rib_1 || '', rib_2: hairdresserData?.rib_2 || '' });
        setEditingRib(false);
    };
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('fr-FR', { 
            style: 'currency', 
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatCurrencyFull = (value) => {
        return new Intl.NumberFormat('fr-FR', { 
            style: 'currency', 
            currency: 'EUR' 
        }).format(value);
    };

    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short'
        });
    };

    const getSalonName = (id) => {
        const s = salons.find(salon => salon.id === id);
        return s ? s.name : 'Inconnu';
    };

    const displayedTransactions = showAllTransactions 
        ? monthTransactions 
        : monthTransactions.slice(0, 5);

    if (loading) {
        return (
            <div className="mobile-loading">
                <div className="loading-spinner" />
                <p>Chargement de vos données...</p>
            </div>
        );
    }

    return (
        <div className="mobile-espace">
            {/* Offline Banner */}
            {!isOnline && (
                <div className="offline-banner">
                    <WifiOff size={16} />
                    <span>Mode hors ligne</span>
                </div>
            )}

            {/* Install PWA Banner */}
            {showInstallBanner && (
                <div className="install-banner">
                    <div className="install-banner-content">
                        <Download size={20} />
                        <span>Installer l'application</span>
                    </div>
                    <button onClick={handleInstall} className="install-btn">
                        Installer
                    </button>
                    <button onClick={() => setShowInstallBanner(false)} className="dismiss-btn">
                        ✕
                    </button>
                </div>
            )}

            {/* Welcome Header */}
            <div className="mobile-header">
                <div className="mobile-header-content">
                    <div className="mobile-avatar">
                        <User size={28} />
                    </div>
                    <div className="mobile-header-text">
                        <h1>Bonjour, {user?.name?.split(' ')[0]} 👋</h1>
                        <p>Bienvenue dans votre espace personnel</p>
                    </div>
                    <button 
                        className={`refresh-btn ${refreshing ? 'refreshing' : ''}`} 
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button 
                        className="logout-btn-mobile"
                        onClick={logout}
                        title="Déconnexion"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mobile-error">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* RIB Section */}
            <div className="mobile-card">
                <div className="mobile-card-header">
                    <h3>Mes coordonnées bancaires</h3>
                    {!editingRib ? (
                        <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditingRib(true)}
                            style={{ padding: '8px', minWidth: 'auto' }}
                        >
                            <Edit2 size={16} />
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                                className="btn btn-ghost btn-sm"
                                onClick={handleCancelRibEdit}
                                style={{ padding: '8px', minWidth: 'auto', color: 'var(--color-error)' }}
                            >
                                <X size={16} />
                            </button>
                            <button 
                                className="btn btn-primary btn-sm"
                                onClick={handleSaveRib}
                                disabled={savingRib}
                                style={{ padding: '8px 12px', minWidth: 'auto' }}
                            >
                                {savingRib ? '...' : <><Save size={16} style={{ marginRight: 4 }} /> Enregistrer</>}
                            </button>
                        </div>
                    )}
                </div>
                
                {editingRib ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '13px', marginBottom: '6px' }}>RIB 1 (IBAN principal)</label>
                            <input
                                type="text"
                                className="form-input"
                                value={ribForm.rib_1}
                                onChange={(e) => setRibForm({ ...ribForm, rib_1: e.target.value })}
                                placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                                style={{ fontSize: '14px' }}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '13px', marginBottom: '6px' }}>RIB 2 (IBAN secondaire - optionnel)</label>
                            <input
                                type="text"
                                className="form-input"
                                value={ribForm.rib_2}
                                onChange={(e) => setRibForm({ ...ribForm, rib_2: e.target.value })}
                                placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                                style={{ fontSize: '14px' }}
                            />
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ 
                            padding: '12px 16px', 
                            background: 'var(--color-bg-secondary)', 
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <CreditCard size={18} style={{ color: 'var(--color-primary-400)', flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>RIB 1</div>
                                <div style={{ 
                                    fontFamily: 'monospace', 
                                    fontSize: '13px',
                                    color: hairdresserData?.rib_1 ? 'var(--color-text-primary)' : 'var(--color-text-muted)'
                                }}>
                                    {hairdresserData?.rib_1 || 'Non renseigné'}
                                </div>
                            </div>
                        </div>
                        <div style={{ 
                            padding: '12px 16px', 
                            background: 'var(--color-bg-secondary)', 
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <CreditCard size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>RIB 2</div>
                                <div style={{ 
                                    fontFamily: 'monospace', 
                                    fontSize: '13px',
                                    color: hairdresserData?.rib_2 ? 'var(--color-text-primary)' : 'var(--color-text-muted)'
                                }}>
                                    {hairdresserData?.rib_2 || 'Non renseigné'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Equipment Deductions Section */}
            {equipmentPurchases.length > 0 && (
                <div className="mobile-card" style={{ 
                    border: '1px solid var(--color-error)',
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.02))'
                }}>
                    <div className="mobile-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Wrench size={18} style={{ color: 'var(--color-error)' }} />
                            <h3 style={{ color: 'var(--color-error)' }}>Déductions Matériel</h3>
                        </div>
                        <span style={{ 
                            fontWeight: 700, 
                            fontSize: '16px', 
                            color: 'var(--color-error)',
                            background: 'var(--color-error-bg)',
                            padding: '4px 12px',
                            borderRadius: '8px'
                        }}>
                            -{formatCurrency(equipmentTotal)}
                        </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                        Achats de matériel déduits de votre salaire ce mois
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {equipmentPurchases.map(eq => (
                            <div key={eq.id} style={{ 
                                padding: '10px 12px', 
                                background: 'var(--color-bg-secondary)', 
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 500, fontSize: '14px' }}>{eq.description}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                        {new Date(eq.purchase_date).toLocaleDateString('fr-FR')}
                                        {eq.notes && ` - ${eq.notes}`}
                                    </div>
                                </div>
                                <span style={{ 
                                    fontWeight: 600, 
                                    color: 'var(--color-error)',
                                    fontSize: '14px'
                                }}>
                                    -{formatCurrency(eq.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats Cards - Horizontal Scroll */}
            <div className="mobile-stats-container">
                <div className="mobile-stats-scroll">
                    <div className="mobile-stat-card gold">
                        <div className="mobile-stat-icon">
                            <Euro size={22} />
                        </div>
                        <div className="mobile-stat-value">
                            {formatCurrency(stats.todayEarnings)}
                        </div>
                        <div className="mobile-stat-label">Gains du jour</div>
                    </div>

                    <div className="mobile-stat-card purple">
                        <div className="mobile-stat-icon">
                            <TrendingUp size={22} />
                        </div>
                        <div className="mobile-stat-value">
                            {formatCurrency(stats.weekEarnings)}
                        </div>
                        <div className="mobile-stat-label">Cette semaine</div>
                    </div>

                    <div className="mobile-stat-card green">
                        <div className="mobile-stat-icon">
                            <Scissors size={22} />
                        </div>
                        <div className="mobile-stat-value">
                            {stats.todayServices}
                        </div>
                        <div className="mobile-stat-label">Services aujourd'hui</div>
                    </div>

                    <div className="mobile-stat-card blue">
                        <div className="mobile-stat-icon">
                            <Calendar size={22} />
                        </div>
                        <div className="mobile-stat-value">
                            {stats.monthServices}
                        </div>
                        <div className="mobile-stat-label">Services ce mois</div>
                    </div>
                </div>
            </div>

            {/* Month Navigation */}
            <div className="mobile-month-nav">
                <button 
                    className="month-nav-btn"
                    onClick={() => changeMonth(-1)}
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="month-nav-label">{formatMonthLabel(filterMonth)}</span>
                <button 
                    className="month-nav-btn"
                    onClick={() => changeMonth(1)}
                    disabled={isCurrentMonth()}
                    style={{ opacity: isCurrentMonth() ? 0.3 : 1 }}
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Monthly Earnings Highlight */}
            <div className="mobile-card mobile-earnings-highlight">
                <div className="earnings-highlight-content">
                    <div className="earnings-highlight-label">Total {formatMonthLabel(filterMonth)}</div>
                    <div className="earnings-highlight-value">
                        {formatCurrencyFull(stats.monthEarnings - equipmentTotal)}
                    </div>
                    <div className="earnings-highlight-details">
                        <span>{stats.monthServices} services</span>
                        {equipmentTotal > 0 && (
                            <span style={{ color: 'var(--color-error)', marginLeft: '8px' }}>
                                (Matériel: -{formatCurrency(equipmentTotal)})
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Monthly Chart */}
            <div className="mobile-card">
                <div className="mobile-card-header">
                    <h3>Évolution du mois</h3>
                    <span className="mobile-badge">{formatCurrency(stats.monthEarnings - equipmentTotal)}</span>
                </div>
                <div className="mobile-chart-container">
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorEarningsMobile" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f6f" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f43f6f" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                            <XAxis
                                dataKey="label"
                                stroke="#9a9286"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#9a9286"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}€`}
                                width={40}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'rgba(255, 255, 255, 0.98)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                                    padding: '12px'
                                }}
                                formatter={(value) => [formatCurrencyFull(value), 'Gains']}
                                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                            />
                            <Area
                                type="monotone"
                                dataKey="earnings"
                                stroke="#f43f6f"
                                strokeWidth={2.5}
                                fill="url(#colorEarningsMobile)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="mobile-card">
                <div className="mobile-card-header">
                    <h3>Services du mois</h3>
                    <span className="mobile-badge-secondary">{monthTransactions.length}</span>
                </div>

                {monthTransactions.length === 0 ? (
                    <div className="mobile-empty-state">
                        <Scissors size={40} />
                        <p>Aucun service ce mois</p>
                    </div>
                ) : (
                    <>
                        <div className="mobile-transactions-list">
                            {displayedTransactions.map((tx) => (
                                <div key={tx.id} className="mobile-transaction-item">
                                    <div className="transaction-left">
                                        <div className="transaction-service">{tx.service_name}</div>
                                        <div className="transaction-details">
                                            <span>{formatDate(tx.service_date_time)}</span>
                                            <span className="dot">•</span>
                                            <span>{formatTime(tx.service_date_time)}</span>
                                        </div>
                                    </div>
                                    <div className="transaction-right">
                                        <div className="transaction-amount">
                                            {formatCurrencyFull(parseFloat(tx.price_coiffeur) || parseFloat(tx.commission_amount) || 0)}
                                        </div>
                                        <div className={`transaction-payment ${tx.payment_method}`}>
                                            {tx.payment_method === 'cash' ? (
                                                <><Banknote size={12} /> Espèces</>
                                            ) : (
                                                <><CreditCard size={12} /> Carte</>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {monthTransactions.length > 5 && (
                            <button 
                                className="show-more-btn"
                                onClick={() => setShowAllTransactions(!showAllTransactions)}
                            >
                                {showAllTransactions ? (
                                    <>Voir moins <ChevronUp size={16} /></>
                                ) : (
                                    <>Voir plus ({monthTransactions.length - 5}) <ChevronDown size={16} /></>
                                )}
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Bottom Spacing for mobile nav */}
            <div className="mobile-bottom-spacer" />
        </div>
    );
};

export default MonEspace;
