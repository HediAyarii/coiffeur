import React, { useState, useEffect } from 'react';
import {
    Euro,
    Scissors,
    Users,
    Building2,
    TrendingUp,
    ArrowUpRight,
    Clock,
    CreditCard,
    Banknote,
    AlertCircle
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { StatCard } from '../components/UI';
import { analyticsAPI, salonsAPI, hairdressersAPI } from '../services/api';

const Dashboard = () => {
    const [stats, setStats] = useState({
        todayRevenue: 0,
        weekRevenue: 0,
        monthRevenue: 0,
        todayServices: 0,
        activeSalons: 0,
        activeHairdressers: 0
    });

    const [revenueData, setRevenueData] = useState([]);
    const [serviceBreakdown, setServiceBreakdown] = useState([]);
    const [topHairdressers, setTopHairdressers] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [paymentStats, setPaymentStats] = useState({ cash: 0, card: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load all data in parallel
            const [
                dashboardStats,
                dailyRevenue,
                serviceStats,
                topHairdressersData,
                recentTxData,
                paymentMethodStats,
                salons,
                hairdressers
            ] = await Promise.all([
                analyticsAPI.getDashboardStats(),
                analyticsAPI.getDailyRevenue(7),
                analyticsAPI.getServiceBreakdown(),
                analyticsAPI.getTopHairdressers(5),
                analyticsAPI.getRecentTransactions(5),
                analyticsAPI.getPaymentMethodStats(),
                salonsAPI.getAll(),
                hairdressersAPI.getAll()
            ]);

            // Set stats
            setStats({
                todayRevenue: dashboardStats.todayRevenue || 0,
                weekRevenue: dashboardStats.weekRevenue || 0,
                monthRevenue: dashboardStats.monthRevenue || 0,
                todayServices: dashboardStats.todayServices || 0,
                activeSalons: salons.filter(s => s.is_active).length,
                activeHairdressers: hairdressers.filter(h => h.is_active).length
            });

            // Revenue chart data
            setRevenueData(dailyRevenue || []);

            // Service breakdown
            setServiceBreakdown((serviceStats || []).slice(0, 5));

            // Top hairdressers
            setTopHairdressers(topHairdressersData || []);

            // Recent transactions
            setRecentTransactions(recentTxData || []);

            // Payment method stats
            setPaymentStats(paymentMethodStats || { cash: { total: 0, count: 0 }, card: { total: 0, count: 0 } });

        } catch (err) {
            console.error('Error loading dashboard data:', err);
            setError('Impossible de charger les données du tableau de bord');
        } finally {
            setLoading(false);
        }
    };

    const COLORS = ['#8b5cf6', '#d4af37', '#10b981', '#3b82f6', '#f59e0b'];

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(value);
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short'
        });
    };

    return (
        <div className="animate-fadeIn">
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

            {loading ? (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '400px',
                    color: 'var(--color-text-muted)'
                }}>
                    Chargement...
                </div>
            ) : (
                <>
            {/* Stats Grid */}
            <div className="grid grid-cols-4" style={{ marginBottom: 'var(--space-8)' }}>
                <StatCard
                    icon={Euro}
                    iconColor="gold"
                    value={stats.todayRevenue}
                    label="Chiffre du jour"
                    prefix=""
                    suffix=" €"
                    trend="up"
                    trendValue="+12%"
                />
                <StatCard
                    icon={TrendingUp}
                    iconColor="purple"
                    value={stats.weekRevenue}
                    label="Cette semaine"
                    prefix=""
                    suffix=" €"
                    trend="up"
                    trendValue="+8%"
                />
                <StatCard
                    icon={Scissors}
                    iconColor="green"
                    value={stats.todayServices}
                    label="Services aujourd'hui"
                />
                <StatCard
                    icon={Users}
                    iconColor="blue"
                    value={stats.activeHairdressers}
                    label="Coiffeurs actifs"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-3" style={{ marginBottom: 'var(--space-8)' }}>
                {/* Revenue Chart */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Évolution du chiffre d'affaires</h3>
                            <p className="card-subtitle">7 derniers jours</p>
                        </div>
                        <div className="badge badge-purple">
                            <TrendingUp size={14} />
                            +15% vs semaine dernière
                        </div>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
                                <XAxis
                                    dataKey="label"
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    tickFormatter={(value) => `${value}€`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(26, 22, 37, 0.95)',
                                        border: '1px solid rgba(139, 92, 246, 0.3)',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                                    }}
                                    labelStyle={{ color: '#f8fafc' }}
                                    formatter={(value) => [formatCurrency(value), 'Revenus']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Modes de paiement</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-4)',
                            padding: 'var(--space-4)',
                            background: 'var(--color-bg-glass)',
                            borderRadius: 'var(--radius-lg)'
                        }}>
                            <div style={{
                                width: 48,
                                height: 48,
                                borderRadius: 'var(--radius-lg)',
                                background: 'rgba(16, 185, 129, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--color-success)'
                            }}>
                                <Banknote size={24} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: 'var(--font-size-xl)',
                                    fontWeight: 600,
                                    color: 'var(--color-text-primary)'
                                }}>
                                    {formatCurrency(paymentStats.cash?.total || 0)}
                                </div>
                                <div style={{
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--color-text-muted)'
                                }}>
                                    Espèces ({paymentStats.cash?.count || 0})
                                </div>
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-4)',
                            padding: 'var(--space-4)',
                            background: 'var(--color-bg-glass)',
                            borderRadius: 'var(--radius-lg)'
                        }}>
                            <div style={{
                                width: 48,
                                height: 48,
                                borderRadius: 'var(--radius-lg)',
                                background: 'rgba(59, 130, 246, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--color-info)'
                            }}>
                                <CreditCard size={24} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: 'var(--font-size-xl)',
                                    fontWeight: 600,
                                    color: 'var(--color-text-primary)'
                                }}>
                                    {formatCurrency(paymentStats.card?.total || 0)}
                                </div>
                                <div style={{
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--color-text-muted)'
                                }}>
                                    Carte ({paymentStats.card?.count || 0})
                                </div>
                            </div>
                        </div>

                        {/* Monthly total */}
                        <div style={{
                            marginTop: 'var(--space-4)',
                            padding: 'var(--space-4)',
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(212, 175, 55, 0.1))',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--color-border)'
                        }}>
                            <div style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-text-muted)',
                                marginBottom: 'var(--space-1)'
                            }}>
                                Total ce mois
                            </div>
                            <div style={{
                                fontSize: 'var(--font-size-2xl)',
                                fontWeight: 700,
                                background: 'linear-gradient(135deg, var(--color-primary-300), var(--color-accent-400))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                {formatCurrency(stats.monthRevenue)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-3" style={{ marginBottom: 'var(--space-8)' }}>
                {/* Top Services */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Services populaires</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {serviceBreakdown.map((item, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-3)',
                                    padding: 'var(--space-3)',
                                    background: 'var(--color-bg-glass)',
                                    borderRadius: 'var(--radius-md)'
                                }}
                            >
                                <div style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 'var(--radius-md)',
                                    background: COLORS[idx],
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 600,
                                    color: 'white'
                                }}>
                                    {idx + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontWeight: 500,
                                        fontSize: 'var(--font-size-sm)'
                                    }}>
                                        {item.service?.name || 'Service'}
                                    </div>
                                    <div style={{
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--color-text-muted)'
                                    }}>
                                        {item.count} prestations
                                    </div>
                                </div>
                                <div style={{
                                    fontWeight: 600,
                                    color: 'var(--color-accent-400)'
                                }}>
                                    {formatCurrency(item.revenue)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Hairdressers */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Top Coiffeurs</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {topHairdressers.map((item, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-3)',
                                    padding: 'var(--space-3)',
                                    background: 'var(--color-bg-glass)',
                                    borderRadius: 'var(--radius-md)'
                                }}
                            >
                                <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 'var(--radius-full)',
                                    background: `linear-gradient(135deg, ${COLORS[idx]}, ${COLORS[(idx + 1) % COLORS.length]})`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 600,
                                    color: 'white'
                                }}>
                                    {item.hairdresser?.first_name?.[0]}{item.hairdresser?.last_name?.[0]}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontWeight: 500,
                                        fontSize: 'var(--font-size-sm)'
                                    }}>
                                        {item.hairdresser?.first_name} {item.hairdresser?.last_name}
                                    </div>
                                    <div style={{
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--color-text-muted)'
                                    }}>
                                        {item.count} services
                                    </div>
                                </div>
                                <div style={{
                                    fontWeight: 600,
                                    color: 'var(--color-primary-300)'
                                }}>
                                    {formatCurrency(item.revenue)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Dernières prestations</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {recentTransactions.map((tx, idx) => {
                            return (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-3)',
                                        padding: 'var(--space-3)',
                                        background: 'var(--color-bg-glass)',
                                        borderRadius: 'var(--radius-md)'
                                    }}
                                >
                                    <div style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 'var(--radius-lg)',
                                        background: tx.payment_method === 'cash'
                                            ? 'rgba(16, 185, 129, 0.15)'
                                            : 'rgba(59, 130, 246, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: tx.payment_method === 'cash'
                                            ? 'var(--color-success)'
                                            : 'var(--color-info)'
                                    }}>
                                        {tx.payment_method === 'cash' ? <Banknote size={18} /> : <CreditCard size={18} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontWeight: 500,
                                            fontSize: 'var(--font-size-sm)'
                                        }}>
                                            {tx.service_name}
                                        </div>
                                        <div style={{
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--color-text-muted)'
                                        }}>
                                            {tx.hairdresser_name || 'Coiffeur'}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontWeight: 600,
                                            fontSize: 'var(--font-size-sm)'
                                        }}>
                                            {formatCurrency(tx.price)}
                                        </div>
                                        <div style={{
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--color-text-muted)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-1)',
                                            justifyContent: 'flex-end'
                                        }}>
                                            <Clock size={12} />
                                            {formatDate(tx.service_date_time)} {formatTime(tx.service_date_time)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
