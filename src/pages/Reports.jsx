import React, { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Building2,
    Users,
    Scissors,
    Euro,
    Calendar,
    AlertCircle,
    Download,
    Filter,
    RefreshCw,
    Target,
    Award,
    Clock,
    CreditCard,
    Banknote,
    PieChart as PieChartIcon,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    Percent,
    FileText,
    ChevronDown
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
    Cell,
    Legend,
    LineChart,
    Line,
    ComposedChart
} from 'recharts';
import { 
    analyticsAPI, 
    salonsAPI, 
    hairdressersAPI, 
    expensesAPI,
    fixedExpensesAPI,
    salaryCostsAPI 
} from '../services/api';

const Reports = () => {
    const [period, setPeriod] = useState('month');
    const [selectedSalon, setSelectedSalon] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [compareMode, setCompareMode] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    
    // Data states
    const [revenueData, setRevenueData] = useState([]);
    const [salonData, setSalonData] = useState([]);
    const [serviceData, setServiceData] = useState([]);
    const [paymentData, setPaymentData] = useState([]);
    const [topHairdressers, setTopHairdressers] = useState([]);
    const [salons, setSalons] = useState([]);
    const [expensesData, setExpensesData] = useState({ fixed: 0, variable: 0, salaries: 0 });
    const [monthlyComparison, setMonthlyComparison] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        totalServices: 0,
        avgTicket: 0,
        profitMargin: 0
    });
    const [previousStats, setPreviousStats] = useState(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        loadReportData();
    }, [period, selectedSalon, selectedMonth]);

    const loadInitialData = async () => {
        try {
            const salonsData = await salonsAPI.getAll();
            setSalons(salonsData.filter(s => s.is_active));
        } catch (err) {
            console.error('Error loading salons:', err);
        }
    };

    const loadReportData = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Get dashboard stats
            const dashboardData = await analyticsAPI.getDashboard();
            
            // Load expenses for the period
            const [year, month] = selectedMonth.split('-');
            let totalExpenses = 0;
            let fixedTotal = 0;
            let variableTotal = 0;
            let salariesTotal = 0;

            try {
                // Fixed expenses
                const fixedParams = { month: selectedMonth };
                if (selectedSalon) fixedParams.salon_id = selectedSalon;
                const fixed = await fixedExpensesAPI.getAll(fixedParams);
                fixedTotal = fixed.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

                // Variable expenses
                let vars = await expensesAPI.getAll();
                if (selectedSalon) {
                    vars = vars.filter(e => e.salon_id === selectedSalon);
                }
                vars = vars.filter(e => {
                    if (!e.date) return false;
                    const d = new Date(e.date);
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedMonth;
                });
                variableTotal = vars.filter(e => e.type === 'variable')
                    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

                // Salary costs
                try {
                    const salaries = await salaryCostsAPI.getAll({ month: selectedMonth });
                    salariesTotal = salaries.reduce((sum, s) => sum + parseFloat(s.total_cost || 0), 0);
                } catch (e) {
                    console.log('Salary costs not available');
                }

                totalExpenses = fixedTotal + variableTotal + salariesTotal;
            } catch (e) {
                console.error('Error loading expenses:', e);
            }

            setExpensesData({ fixed: fixedTotal, variable: variableTotal, salaries: salariesTotal });

            // Calculate period revenue
            let periodRevenue = dashboardData.monthRevenue || 0;
            if (period === 'week') {
                periodRevenue = dashboardData.weekRevenue || 0;
            } else if (period === 'year') {
                periodRevenue = dashboardData.yearRevenue || dashboardData.monthRevenue * 12 || 0;
            }

            const netProfit = periodRevenue - totalExpenses;
            const profitMargin = periodRevenue > 0 ? (netProfit / periodRevenue) * 100 : 0;

            setStats({
                totalRevenue: periodRevenue,
                totalExpenses,
                netProfit,
                totalServices: dashboardData.todayServices || 0,
                avgTicket: dashboardData.avgTicket || (dashboardData.todayServices > 0 ? periodRevenue / dashboardData.todayServices : 0),
                profitMargin
            });

            // Revenue over time
            let days = 30;
            if (period === 'week') days = 7;
            else if (period === 'year') days = 365;
            
            const dailyRevenue = await analyticsAPI.getDailyRevenue(days);
            setRevenueData(dailyRevenue);

            // Revenue by salon
            const salonRevenue = await analyticsAPI.getRevenueBySalon(period);
            setSalonData(salonRevenue.filter(s => s.revenue > 0));

            // Service breakdown
            const breakdown = await analyticsAPI.getServiceBreakdown(period);
            setServiceData(breakdown.slice(0, 8));

            // Payment methods
            const pmStats = await analyticsAPI.getPaymentMethods(period);
            const cashTotal = pmStats.cash?.total || 0;
            const cardTotal = pmStats.card?.total || 0;
            const total = cashTotal + cardTotal;
            setPaymentData([
                { 
                    name: 'Espèces', 
                    value: cashTotal, 
                    count: pmStats.cash?.count || 0,
                    percentage: total > 0 ? (cashTotal / total * 100).toFixed(1) : 0
                },
                { 
                    name: 'Carte', 
                    value: cardTotal, 
                    count: pmStats.card?.count || 0,
                    percentage: total > 0 ? (cardTotal / total * 100).toFixed(1) : 0
                }
            ]);

            // Top hairdressers
            const topHd = await analyticsAPI.getTopHairdressers(5, period);
            setTopHairdressers(topHd);

            // Monthly comparison for trend
            const comparisonData = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const monthLabel = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
                // Simulate data - in production, fetch from API
                comparisonData.push({
                    month: monthLabel,
                    revenue: Math.random() * 50000 + 30000,
                    expenses: Math.random() * 20000 + 15000,
                    profit: 0
                });
            }
            comparisonData.forEach(d => d.profit = d.revenue - d.expenses);
            setMonthlyComparison(comparisonData);

        } catch (err) {
            console.error('Error loading report data:', err);
            setError(err.message || 'Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);
    };

    const formatPercent = (value) => {
        return `${(value || 0).toFixed(1)}%`;
    };

    const COLORS = ['#f43f5e', '#d4af37', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    const PAYMENT_COLORS = ['#10b981', '#3b82f6'];
    const EXPENSE_COLORS = ['#f43f5e', '#f59e0b', '#8b5cf6'];

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Métrique', 'Valeur'];
        const rows = [
            ['Chiffre d\'affaires', stats.totalRevenue],
            ['Dépenses totales', stats.totalExpenses],
            ['Charges fixes', expensesData.fixed],
            ['Dépenses variables', expensesData.variable],
            ['Coûts salariaux', expensesData.salaries],
            ['Résultat net', stats.netProfit],
            ['Marge bénéficiaire', `${stats.profitMargin.toFixed(1)}%`]
        ];
        
        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `rapport_${selectedMonth}.csv`;
        link.click();
    };

    // Custom tooltip for charts
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid rgba(244, 63, 94, 0.2)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}>
                    <p style={{ fontWeight: 600, marginBottom: '8px', color: '#1a1625' }}>{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color, fontSize: '14px' }}>
                            {entry.name}: {formatCurrency(entry.value)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="animate-fadeIn">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Rapports & Analyses</h1>
                        <p className="page-subtitle">Chargement des données...</p>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                    <div className="loading-spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
                <div>
                    <h1 className="page-title">Rapports & Analyses</h1>
                    <p className="page-subtitle">Visualisez les performances de votre activité</p>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Month Selector */}
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="form-input"
                        style={{ width: '180px' }}
                    />

                    {/* Salon Filter */}
                    <select
                        value={selectedSalon}
                        onChange={(e) => setSelectedSalon(e.target.value)}
                        className="form-select"
                        style={{ width: '200px' }}
                    >
                        <option value="">Tous les salons</option>
                        {salons.map(salon => (
                            <option key={salon.id} value={salon.id}>{salon.name}</option>
                        ))}
                    </select>

                    {/* Period Tabs */}
                    <div className="tabs">
                        <button
                            className={`tab ${period === 'week' ? 'active' : ''}`}
                            onClick={() => setPeriod('week')}
                        >
                            Semaine
                        </button>
                        <button
                            className={`tab ${period === 'month' ? 'active' : ''}`}
                            onClick={() => setPeriod('month')}
                        >
                            Mois
                        </button>
                        <button
                            className={`tab ${period === 'year' ? 'active' : ''}`}
                            onClick={() => setPeriod('year')}
                        >
                            Année
                        </button>
                    </div>

                    {/* Export Button */}
                    <button className="btn btn-secondary" onClick={exportToCSV}>
                        <Download size={18} />
                        Exporter
                    </button>

                    {/* Refresh */}
                    <button className="btn btn-ghost" onClick={loadReportData}>
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="card" style={{ 
                    padding: 'var(--space-4)', 
                    marginBottom: 'var(--space-6)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <AlertCircle size={20} style={{ color: 'var(--color-error)' }} />
                        <span style={{ color: 'var(--color-error)' }}>{error}</span>
                        <button className="btn btn-sm btn-primary" onClick={loadReportData}>Réessayer</button>
                    </div>
                </div>
            )}

            {/* Key Metrics - Enhanced */}
            <div className="grid grid-cols-4" style={{ marginBottom: 'var(--space-8)', gap: 'var(--space-4)' }}>
                {/* Revenue Card */}
                <div className="stat-card" style={{ 
                    background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(244, 63, 94, 0.05) 100%)',
                    border: '1px solid rgba(244, 63, 94, 0.2)'
                }}>
                    <div className="stat-card-header">
                        <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}>
                            <Euro size={24} color="white" />
                        </div>
                        <span className="stat-card-trend up">
                            <ArrowUpRight size={16} />
                            CA
                        </span>
                    </div>
                    <div className="stat-card-value" style={{ color: '#f43f5e', fontSize: '2rem' }}>
                        {formatCurrency(stats.totalRevenue)}
                    </div>
                    <div className="stat-card-label">Chiffre d'affaires</div>
                </div>

                {/* Expenses Card */}
                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                            <CreditCard size={24} color="white" />
                        </div>
                    </div>
                    <div className="stat-card-value" style={{ color: '#f59e0b', fontSize: '2rem' }}>
                        {formatCurrency(stats.totalExpenses)}
                    </div>
                    <div className="stat-card-label">Dépenses totales</div>
                    <div style={{ 
                        marginTop: 'var(--space-2)', 
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-muted)'
                    }}>
                        <span>Fixes: {formatCurrency(expensesData.fixed)}</span>
                        <span style={{ margin: '0 8px' }}>•</span>
                        <span>Variables: {formatCurrency(expensesData.variable)}</span>
                    </div>
                </div>

                {/* Net Profit Card */}
                <div className="stat-card" style={{
                    background: stats.netProfit >= 0 
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)'
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
                    border: `1px solid ${stats.netProfit >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                }}>
                    <div className="stat-card-header">
                        <div className="stat-card-icon" style={{ 
                            background: stats.netProfit >= 0 
                                ? 'linear-gradient(135deg, #10b981, #059669)'
                                : 'linear-gradient(135deg, #ef4444, #dc2626)'
                        }}>
                            {stats.netProfit >= 0 ? <TrendingUp size={24} color="white" /> : <TrendingDown size={24} color="white" />}
                        </div>
                        <span className={`stat-card-trend ${stats.netProfit >= 0 ? 'up' : 'down'}`}>
                            {stats.netProfit >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                            {stats.netProfit >= 0 ? 'Bénéfice' : 'Perte'}
                        </span>
                    </div>
                    <div className="stat-card-value" style={{ 
                        color: stats.netProfit >= 0 ? '#10b981' : '#ef4444',
                        fontSize: '2rem'
                    }}>
                        {formatCurrency(stats.netProfit)}
                    </div>
                    <div className="stat-card-label">Résultat net</div>
                </div>

                {/* Profit Margin Card */}
                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                            <Percent size={24} color="white" />
                        </div>
                    </div>
                    <div className="stat-card-value" style={{ 
                        color: stats.profitMargin >= 20 ? '#10b981' : stats.profitMargin >= 10 ? '#f59e0b' : '#ef4444',
                        fontSize: '2rem'
                    }}>
                        {formatPercent(stats.profitMargin)}
                    </div>
                    <div className="stat-card-label">Marge bénéficiaire</div>
                    <div style={{ 
                        marginTop: 'var(--space-2)',
                        height: '6px',
                        background: 'var(--color-bg-tertiary)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${Math.min(Math.abs(stats.profitMargin), 100)}%`,
                            height: '100%',
                            background: stats.profitMargin >= 20 ? '#10b981' : stats.profitMargin >= 10 ? '#f59e0b' : '#ef4444',
                            borderRadius: '3px',
                            transition: 'width 0.5s ease'
                        }} />
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-3" style={{ marginBottom: 'var(--space-8)', gap: 'var(--space-6)' }}>
                {/* Revenue Chart - Enhanced */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="card-title">
                            <BarChart3 size={20} style={{ marginRight: '8px', color: '#f43f5e' }} />
                            Évolution du chiffre d'affaires
                        </h3>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                            {period === 'week' ? '7 derniers jours' : period === 'month' ? '30 derniers jours' : '12 derniers mois'}
                        </div>
                    </div>
                    <div className="chart-container" style={{ height: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(244, 63, 94, 0.1)" />
                                <XAxis
                                    dataKey="label"
                                    stroke="#94a3b8"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `${v}€`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    name="CA"
                                    stroke="#f43f5e"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    name="CA"
                                    stroke="#f43f5e"
                                    strokeWidth={3}
                                    dot={{ fill: '#f43f5e', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, fill: '#f43f5e' }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expense Breakdown Pie */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <PieChartIcon size={20} style={{ marginRight: '8px', color: '#f59e0b' }} />
                            Répartition des dépenses
                        </h3>
                    </div>
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Charges fixes', value: expensesData.fixed },
                                        { name: 'Variables', value: expensesData.variable },
                                        { name: 'Salaires', value: expensesData.salaries }
                                    ].filter(d => d.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45}
                                    outerRadius={70}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {[0, 1, 2].map((index) => (
                                        <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: '0 var(--space-4)' }}>
                        {[
                            { name: 'Charges fixes', value: expensesData.fixed, color: EXPENSE_COLORS[0] },
                            { name: 'Variables', value: expensesData.variable, color: EXPENSE_COLORS[1] },
                            { name: 'Salaires', value: expensesData.salaries, color: EXPENSE_COLORS[2] }
                        ].map((item, idx) => (
                            <div key={idx} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                fontSize: 'var(--font-size-sm)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                    <div style={{ 
                                        width: 10, 
                                        height: 10, 
                                        borderRadius: '50%', 
                                        background: item.color 
                                    }} />
                                    <span>{item.name}</span>
                                </div>
                                <span style={{ fontWeight: 600 }}>{formatCurrency(item.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-2" style={{ marginBottom: 'var(--space-8)', gap: 'var(--space-6)' }}>
                {/* Salon Performance */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <Building2 size={20} style={{ marginRight: '8px', color: '#3b82f6' }} />
                            Performance par salon
                        </h3>
                    </div>
                    <div style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salonData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(244, 63, 94, 0.1)" />
                                <XAxis
                                    type="number"
                                    stroke="#94a3b8"
                                    fontSize={11}
                                    tickFormatter={(v) => `${v}€`}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    stroke="#94a3b8"
                                    fontSize={11}
                                    width={120}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey="revenue"
                                    name="CA"
                                    fill="#f43f5e"
                                    radius={[0, 8, 8, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <CreditCard size={20} style={{ marginRight: '8px', color: '#10b981' }} />
                            Modes de paiement
                        </h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-4)', gap: 'var(--space-6)' }}>
                        <div style={{ width: 180, height: 180 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={paymentData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={75}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {paymentData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ flex: 1 }}>
                            {paymentData.map((item, idx) => (
                                <div key={idx} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    padding: 'var(--space-3) var(--space-4)',
                                    background: 'var(--color-bg-secondary)',
                                    borderRadius: 'var(--radius-lg)',
                                    marginBottom: 'var(--space-2)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                        <div style={{ 
                                            width: 40, 
                                            height: 40, 
                                            borderRadius: 'var(--radius-md)',
                                            background: `${PAYMENT_COLORS[idx]}20`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {idx === 0 ? <Banknote size={20} color={PAYMENT_COLORS[idx]} /> : <CreditCard size={20} color={PAYMENT_COLORS[idx]} />}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                                {item.count} transactions
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, color: PAYMENT_COLORS[idx] }}>
                                            {formatCurrency(item.value)}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                            {item.percentage}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 3 */}
            <div className="grid grid-cols-2" style={{ gap: 'var(--space-6)' }}>
                {/* Top Hairdressers */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <Award size={20} style={{ marginRight: '8px', color: '#d4af37' }} />
                            Top Coiffeurs
                        </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {topHairdressers.length === 0 ? (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: 'var(--space-6)',
                                color: 'var(--color-text-muted)'
                            }}>
                                Aucune donnée pour cette période
                            </div>
                        ) : (
                            topHairdressers.map((hd, idx) => {
                                const maxRevenue = Math.max(...topHairdressers.map(h => h.revenue));
                                const percentage = maxRevenue > 0 ? (hd.revenue / maxRevenue) * 100 : 0;
                                const medals = ['🥇', '🥈', '🥉'];
                                
                                return (
                                    <div key={hd.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-3)',
                                        padding: 'var(--space-3)',
                                        background: idx === 0 ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(212, 175, 55, 0.05))' : 'var(--color-bg-secondary)',
                                        borderRadius: 'var(--radius-lg)',
                                        border: idx === 0 ? '1px solid rgba(212, 175, 55, 0.3)' : 'none'
                                    }}>
                                        <div style={{ 
                                            fontSize: '1.5rem',
                                            width: 40,
                                            textAlign: 'center'
                                        }}>
                                            {idx < 3 ? medals[idx] : `#${idx + 1}`}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600 }}>
                                                {hd.first_name} {hd.last_name}
                                            </div>
                                            <div style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: 'var(--space-4)',
                                                marginTop: 'var(--space-1)'
                                            }}>
                                                <div style={{
                                                    flex: 1,
                                                    height: 6,
                                                    background: 'var(--color-bg-tertiary)',
                                                    borderRadius: '3px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${percentage}%`,
                                                        height: '100%',
                                                        background: idx === 0 ? '#d4af37' : '#f43f5e',
                                                        borderRadius: '3px'
                                                    }} />
                                                </div>
                                                <span style={{ 
                                                    fontSize: 'var(--font-size-xs)',
                                                    color: 'var(--color-text-muted)'
                                                }}>
                                                    {hd.count} services
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ 
                                            fontWeight: 700,
                                            color: idx === 0 ? '#d4af37' : '#f43f5e',
                                            fontSize: 'var(--font-size-lg)'
                                        }}>
                                            {formatCurrency(hd.revenue)}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Service Breakdown - Enhanced */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <Scissors size={20} style={{ marginRight: '8px', color: '#8b5cf6' }} />
                            Services les plus populaires
                        </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {serviceData.length === 0 ? (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: 'var(--space-6)',
                                color: 'var(--color-text-muted)'
                            }}>
                                Aucune donnée pour cette période
                            </div>
                        ) : (
                            serviceData.map((item, idx) => {
                                const maxRevenue = Math.max(...serviceData.map(s => s.revenue));
                                const percentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                                const totalServices = serviceData.reduce((sum, s) => sum + s.count, 0);
                                const servicePercent = totalServices > 0 ? (item.count / totalServices * 100).toFixed(0) : 0;

                                return (
                                    <div key={idx} style={{
                                        padding: 'var(--space-3)',
                                        background: 'var(--color-bg-secondary)',
                                        borderRadius: 'var(--radius-lg)'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: 'var(--space-2)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                <div style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    background: COLORS[idx % COLORS.length]
                                                }} />
                                                <span style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>
                                                    {item.service_name || 'Service'}
                                                </span>
                                            </div>
                                            <span style={{
                                                fontWeight: 700,
                                                color: '#f43f5e'
                                            }}>
                                                {formatCurrency(item.revenue)}
                                            </span>
                                        </div>
                                        <div style={{
                                            height: 6,
                                            background: 'var(--color-bg-tertiary)',
                                            borderRadius: '3px',
                                            overflow: 'hidden',
                                            marginBottom: 'var(--space-1)'
                                        }}>
                                            <div style={{
                                                width: `${percentage}%`,
                                                height: '100%',
                                                background: `linear-gradient(90deg, ${COLORS[idx % COLORS.length]}, ${COLORS[(idx + 1) % COLORS.length]})`,
                                                borderRadius: '3px',
                                                transition: 'width 0.5s ease'
                                            }} />
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--color-text-muted)'
                                        }}>
                                            <span>{item.count} prestations</span>
                                            <span>{servicePercent}% du total</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
