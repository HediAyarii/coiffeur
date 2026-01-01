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
    Wifi,
    WifiOff,
    Download,
    LogOut
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
    salonsAPI
} from '../services/api';

const MonEspace = () => {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState({
        todayEarnings: 0,
        weekEarnings: 0,
        monthEarnings: 0,
        todayServices: 0,
        monthServices: 0
    });
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
    }, [user]);

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

            // This month
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthTx = allTransactions.filter(t => {
                const d = new Date(t.service_date_time);
                return d >= monthStart && d < tomorrow;
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

            // Recent transactions
            const sorted = [...allTransactions].sort((a, b) =>
                new Date(b.service_date_time) - new Date(a.service_date_time)
            );
            setRecentTransactions(sorted.slice(0, 20));

            // Weekly data for chart
            const chartData = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                const nextDate = new Date(date);
                nextDate.setDate(nextDate.getDate() + 1);

                const dayTx = allTransactions.filter(t => {
                    const d = new Date(t.service_date_time);
                    return d >= date && d < nextDate;
                });

                chartData.push({
                    label: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
                    fullDate: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                    earnings: dayTx.reduce((sum, t) => sum + getEarnings(t), 0),
                    services: dayTx.length
                });
            }
            setWeeklyData(chartData);

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
                    recentTransactions: sorted.slice(0, 20),
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
                    setRecentTransactions(data.recentTransactions);
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
    }, [user]);

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
        ? recentTransactions 
        : recentTransactions.slice(0, 5);

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

            {/* Monthly Earnings Highlight */}
            <div className="mobile-card mobile-earnings-highlight">
                <div className="earnings-highlight-content">
                    <div className="earnings-highlight-label">Total du mois</div>
                    <div className="earnings-highlight-value">
                        {formatCurrencyFull(stats.monthEarnings)}
                    </div>
                    <div className="earnings-highlight-details">
                        <span>{stats.monthServices} services</span>
                        <span className="separator">•</span>
                        <span>
                            {stats.monthServices > 0 
                                ? formatCurrencyFull(stats.monthEarnings / stats.monthServices) + ' / service'
                                : '—'
                            }
                        </span>
                    </div>
                </div>
            </div>

            {/* Weekly Chart */}
            <div className="mobile-card">
                <div className="mobile-card-header">
                    <h3>7 derniers jours</h3>
                    <span className="mobile-badge">{formatCurrency(stats.weekEarnings)}</span>
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
                    <h3>Derniers services</h3>
                    <span className="mobile-badge-secondary">{recentTransactions.length}</span>
                </div>

                {recentTransactions.length === 0 ? (
                    <div className="mobile-empty-state">
                        <Scissors size={40} />
                        <p>Aucun service enregistré</p>
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

                        {recentTransactions.length > 5 && (
                            <button 
                                className="show-more-btn"
                                onClick={() => setShowAllTransactions(!showAllTransactions)}
                            >
                                {showAllTransactions ? (
                                    <>Voir moins <ChevronUp size={16} /></>
                                ) : (
                                    <>Voir plus ({recentTransactions.length - 5}) <ChevronDown size={16} /></>
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
