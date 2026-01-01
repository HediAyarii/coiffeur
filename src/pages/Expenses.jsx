import React, { useState, useEffect } from 'react';
import { 
    Plus, Edit2, Trash2, Wallet, Calendar, Building2, AlertCircle, 
    RefreshCw, History, TrendingDown, Repeat, Clock
} from 'lucide-react';
import { Modal, DataTable } from '../components/UI';
import { expensesAPI, fixedExpensesAPI, salonsAPI } from '../services/api';

const Expenses = () => {
    // Variable expenses
    const [variableExpenses, setVariableExpenses] = useState([]);
    // Fixed expenses (recurring)
    const [fixedExpenses, setFixedExpenses] = useState([]);
    const [salons, setSalons] = useState([]);
    
    // Modals
    const [showVariableModal, setShowVariableModal] = useState(false);
    const [showFixedModal, setShowFixedModal] = useState(false);
    const [showAmountModal, setShowAmountModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    
    const [editing, setEditing] = useState(null);
    const [selectedFixedExpense, setSelectedFixedExpense] = useState(null);
    const [amountHistory, setAmountHistory] = useState([]);
    
    // Filters
    const [filterSalon, setFilterSalon] = useState('');
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'fixed', 'variable'
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Form data for variable expenses
    const [variableFormData, setVariableFormData] = useState({
        salon_id: '',
        category: 'supplies',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
    });
    
    // Form data for fixed expenses
    const [fixedFormData, setFixedFormData] = useState({
        salon_id: '',
        category: 'rent',
        name: '',
        description: '',
        amount: '',
        effective_from: new Date().toISOString().slice(0, 7) + '-01'
    });
    
    // Form for updating amount
    const [amountFormData, setAmountFormData] = useState({
        amount: '',
        effective_from: ''
    });

    const categories = [
        { value: 'rent', label: 'Loyer', fixed: true },
        { value: 'utilities', label: 'Charges (eau, électricité)', fixed: true },
        { value: 'insurance', label: 'Assurance', fixed: true },
        { value: 'taxes', label: 'Taxes', fixed: true },
        { value: 'subscriptions', label: 'Abonnements', fixed: true },
        { value: 'supplies', label: 'Fournitures', fixed: false },
        { value: 'marketing', label: 'Marketing', fixed: false },
        { value: 'equipment', label: 'Équipement', fixed: false },
        { value: 'maintenance', label: 'Maintenance', fixed: false },
        { value: 'other', label: 'Autre', fixed: false }
    ];

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (salons.length > 0 || true) {
            loadExpenses();
        }
    }, [filterSalon, filterMonth]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const salonsData = await salonsAPI.getAll();
            setSalons(salonsData.filter(s => s.is_active));
            await loadExpenses();
        } catch (err) {
            console.error('Error loading data:', err);
            setError('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    // Helper to extract YYYY-MM from a date string (handles timezone issues)
    const getMonthFromDate = (dateStr) => {
        if (!dateStr) return '';
        // Parse the date and format it in local timezone
        const d = new Date(dateStr);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    const loadExpenses = async () => {
        try {
            // Load variable expenses
            let vars = await expensesAPI.getAll();
            if (filterSalon) {
                vars = vars.filter(e => e.salon_id === filterSalon);
            }
            if (filterMonth) {
                vars = vars.filter(e => e.date && getMonthFromDate(e.date) === filterMonth);
            }
            // Only show variable type in variable list
            vars = vars.filter(e => e.type === 'variable');
            vars.sort((a, b) => new Date(b.date) - new Date(a.date));
            setVariableExpenses(vars);

            // Load fixed expenses for the selected month
            const fixedParams = { month: filterMonth };
            if (filterSalon) fixedParams.salon_id = filterSalon;
            const fixed = await fixedExpensesAPI.getAll(fixedParams);
            setFixedExpenses(fixed);
        } catch (err) {
            console.error('Error loading expenses:', err);
            setError('Erreur lors du chargement des dépenses');
        }
    };

    // Variable expense handlers
    const handleSubmitVariable = async (e) => {
        if (e) e.preventDefault();
        
        // Validation
        if (!variableFormData.salon_id) {
            setError('Veuillez sélectionner un salon');
            return;
        }
        if (!variableFormData.amount || parseFloat(variableFormData.amount) <= 0) {
            setError('Veuillez entrer un montant valide');
            return;
        }
        if (!variableFormData.date) {
            setError('Veuillez sélectionner une date');
            return;
        }
        
        try {
            const dataToSend = {
                ...variableFormData,
                amount: parseFloat(variableFormData.amount),
                type: 'variable'
            };
            if (editing) {
                await expensesAPI.update(editing.id, dataToSend);
            } else {
                await expensesAPI.create(dataToSend);
            }
            setShowVariableModal(false);
            resetVariableForm();
            await loadExpenses();
        } catch (err) {
            console.error('Error saving expense:', err);
            setError('Erreur lors de l\'enregistrement: ' + (err.message || 'Erreur serveur'));
        }
    };

    const handleEditVariable = (item) => {
        setEditing(item);
        setVariableFormData({
            salon_id: item.salon_id || '',
            category: item.category,
            amount: item.amount,
            date: item.date,
            description: item.description || ''
        });
        setShowVariableModal(true);
    };

    const handleDeleteVariable = async (item) => {
        if (confirm('Supprimer cette dépense ?')) {
            try {
                await expensesAPI.delete(item.id);
                await loadExpenses();
            } catch (err) {
                console.error('Error deleting expense:', err);
                setError('Erreur lors de la suppression');
            }
        }
    };

    const resetVariableForm = () => {
        setEditing(null);
        setVariableFormData({
            salon_id: filterSalon || '',
            category: 'supplies',
            amount: '',
            date: filterMonth ? `${filterMonth}-01` : new Date().toISOString().split('T')[0],
            description: ''
        });
    };

    // Fixed expense handlers
    const handleSubmitFixed = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await fixedExpensesAPI.update(editing.id, {
                    salon_id: fixedFormData.salon_id,
                    category: fixedFormData.category,
                    name: fixedFormData.name,
                    description: fixedFormData.description,
                    is_active: true
                });
            } else {
                await fixedExpensesAPI.create({
                    salon_id: fixedFormData.salon_id,
                    category: fixedFormData.category,
                    name: fixedFormData.name,
                    description: fixedFormData.description,
                    amount: parseFloat(fixedFormData.amount) || 0,
                    effective_from: fixedFormData.effective_from
                });
            }
            setShowFixedModal(false);
            resetFixedForm();
            await loadExpenses();
        } catch (err) {
            console.error('Error saving fixed expense:', err);
            setError('Erreur lors de l\'enregistrement');
        }
    };

    const handleEditFixed = (item) => {
        setEditing(item);
        setFixedFormData({
            salon_id: item.salon_id || '',
            category: item.category,
            name: item.name,
            description: item.description || '',
            amount: item.amount || 0,
            effective_from: filterMonth + '-01'
        });
        setShowFixedModal(true);
    };

    const handleDeleteFixed = async (item) => {
        if (confirm('Supprimer cette dépense fixe ? Elle ne sera plus appliquée aux mois suivants.')) {
            try {
                await fixedExpensesAPI.delete(item.id);
                await loadExpenses();
            } catch (err) {
                console.error('Error deleting fixed expense:', err);
                setError('Erreur lors de la suppression');
            }
        }
    };

    const resetFixedForm = () => {
        setEditing(null);
        setFixedFormData({
            salon_id: filterSalon || '',
            category: 'rent',
            name: '',
            description: '',
            amount: '',
            effective_from: filterMonth + '-01'
        });
    };

    // Amount update handlers
    const openAmountModal = (item) => {
        setSelectedFixedExpense(item);
        setAmountFormData({
            amount: item.amount || '',
            effective_from: filterMonth + '-01'
        });
        setShowAmountModal(true);
    };

    const handleSubmitAmount = async (e) => {
        e.preventDefault();
        try {
            await fixedExpensesAPI.updateAmount(
                selectedFixedExpense.id,
                parseFloat(amountFormData.amount),
                amountFormData.effective_from
            );
            setShowAmountModal(false);
            await loadExpenses();
        } catch (err) {
            console.error('Error updating amount:', err);
            setError('Erreur lors de la mise à jour du montant');
        }
    };

    // History handlers
    const openHistoryModal = async (item) => {
        try {
            setSelectedFixedExpense(item);
            const history = await fixedExpensesAPI.getHistory(item.id);
            setAmountHistory(history);
            setShowHistoryModal(true);
        } catch (err) {
            console.error('Error loading history:', err);
            setError('Erreur lors du chargement de l\'historique');
        }
    };

    // Utilities
    const getSalonName = (id) => {
        const s = salons.find(salon => salon.id === id);
        return s ? s.name : 'Tous';
    };

    const getCategoryLabel = (value) => {
        const cat = categories.find(c => c.value === value);
        return cat ? cat.label : value;
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatMonth = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            month: 'long',
            year: 'numeric'
        });
    };

    // Calculate totals
    const totalFixed = fixedExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const totalVariable = variableExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const totalExpenses = totalFixed + totalVariable;

    // Group by category for summary
    const allExpenses = [
        ...fixedExpenses.map(e => ({ ...e, type: 'fixed' })),
        ...variableExpenses.map(e => ({ ...e, type: 'variable' }))
    ];
    const categoryTotals = categories.map(cat => ({
        ...cat,
        total: allExpenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

    // Columns for fixed expenses
    const fixedColumns = [
        {
            header: 'Dépense',
            render: (row) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{row.name}</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                        {getCategoryLabel(row.category)}
                    </div>
                </div>
            )
        },
        {
            header: 'Salon',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                    <Building2 size={14} />
                    {getSalonName(row.salon_id)}
                </div>
            )
        },
        {
            header: 'Montant',
            render: (row) => (
                <span style={{ fontWeight: 700, color: 'var(--color-error)' }}>
                    {formatCurrency(row.amount)}
                </span>
            )
        },
        {
            header: 'Depuis',
            render: (row) => (
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                    {row.amount_effective_from ? formatMonth(row.amount_effective_from) : '-'}
                </span>
            )
        },
        {
            header: 'Actions',
            width: '150px',
            render: (row) => (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); openAmountModal(row); }}
                        title="Modifier le montant"
                        style={{ color: 'var(--color-gold-600)' }}
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); openHistoryModal(row); }}
                        title="Historique"
                    >
                        <History size={16} />
                    </button>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleDeleteFixed(row); }}
                        style={{ color: 'var(--color-error)' }}
                        title="Supprimer"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    // Columns for variable expenses
    const variableColumns = [
        {
            header: 'Date',
            width: '120px',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
                    <Calendar size={14} />
                    {formatDate(row.date)}
                </div>
            )
        },
        {
            header: 'Description',
            render: (row) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{row.description || getCategoryLabel(row.category)}</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                        {getCategoryLabel(row.category)}
                    </div>
                </div>
            )
        },
        {
            header: 'Salon',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                    <Building2 size={14} />
                    {getSalonName(row.salon_id)}
                </div>
            )
        },
        {
            header: 'Montant',
            render: (row) => (
                <span style={{ fontWeight: 600, color: 'var(--color-error)' }}>
                    -{formatCurrency(row.amount)}
                </span>
            )
        },
        {
            header: 'Actions',
            width: '100px',
            render: (row) => (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleEditVariable(row); }}
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleDeleteVariable(row); }}
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
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Gestion des Dépenses</h1>
                    <p className="page-subtitle">Charges fixes récurrentes et dépenses variables</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <button className="btn btn-secondary" onClick={() => { resetFixedForm(); setShowFixedModal(true); }}>
                        <Repeat size={18} />
                        Nouvelle Charge Fixe
                    </button>
                    <button className="btn btn-primary" onClick={() => { resetVariableForm(); setShowVariableModal(true); }}>
                        <Plus size={18} />
                        Nouvelle Dépense
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <AlertCircle size={18} />
                    {error}
                    <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="stat-card">
                    <div className="stat-card-icon purple">
                        <Wallet size={24} />
                    </div>
                    <div className="stat-card-value" style={{ marginTop: 'var(--space-4)', color: 'var(--color-error)' }}>
                        {formatCurrency(totalExpenses)}
                    </div>
                    <div className="stat-card-label">Total dépenses</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon blue">
                        <Repeat size={24} />
                    </div>
                    <div className="stat-card-value" style={{ marginTop: 'var(--space-4)' }}>{formatCurrency(totalFixed)}</div>
                    <div className="stat-card-label">Charges fixes</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon gold">
                        <TrendingDown size={24} />
                    </div>
                    <div className="stat-card-value" style={{ marginTop: 'var(--space-4)' }}>{formatCurrency(totalVariable)}</div>
                    <div className="stat-card-label">Charges variables</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value">{fixedExpenses.length + variableExpenses.length}</div>
                    <div className="stat-card-label">Nombre d'écritures</div>
                </div>
            </div>

            {/* Filters + Category breakdown */}
            <div className="grid grid-cols-3" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Filtres</h3>
                    <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                            <label className="form-label">Mois</label>
                            <input
                                type="month"
                                className="form-input"
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                            <label className="form-label">Salon</label>
                            <select
                                className="form-select"
                                value={filterSalon}
                                onChange={(e) => setFilterSalon(e.target.value)}
                            >
                                <option value="">Tous les salons</option>
                                {salons.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Par catégorie</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '150px', overflowY: 'auto' }}>
                        {categoryTotals.slice(0, 6).map(cat => (
                            <div key={cat.value} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                    {cat.label}
                                </span>
                                <span style={{ fontWeight: 600, color: 'var(--color-error)' }}>
                                    {formatCurrency(cat.total)}
                                </span>
                            </div>
                        ))}
                        {categoryTotals.length === 0 && (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Aucune dépense</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                <button
                    className={`btn ${activeTab === 'fixed' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('fixed')}
                >
                    <Repeat size={16} />
                    Charges Fixes ({fixedExpenses.length})
                </button>
                <button
                    className={`btn ${activeTab === 'variable' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('variable')}
                >
                    <TrendingDown size={16} />
                    Dépenses Variables ({variableExpenses.length})
                </button>
            </div>

            {/* Fixed Expenses Table */}
            {activeTab === 'fixed' && (
                <div className="card">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Charges Fixes Récurrentes</h3>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                                Ces charges sont automatiquement appliquées chaque mois. Modifiez le montant pour l'appliquer à partir d'un mois donné.
                            </p>
                        </div>
                    </div>
                    <DataTable
                        columns={fixedColumns}
                        data={fixedExpenses}
                        emptyMessage="Aucune charge fixe configurée"
                    />
                </div>
            )}

            {/* Variable Expenses Table */}
            {activeTab === 'variable' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Dépenses Variables</h3>
                    </div>
                    <DataTable
                        columns={variableColumns}
                        data={variableExpenses}
                        emptyMessage="Aucune dépense variable ce mois"
                    />
                </div>
            )}

            {/* Modal: New Variable Expense */}
            <Modal
                isOpen={showVariableModal}
                onClose={() => { setShowVariableModal(false); setError(null); }}
                title={editing ? 'Modifier la Dépense' : 'Nouvelle Dépense Variable'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => { setShowVariableModal(false); setError(null); }}>
                            Annuler
                        </button>
                        <button className="btn btn-primary" onClick={handleSubmitVariable}>
                            {editing ? 'Enregistrer' : 'Créer'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmitVariable}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Salon *</label>
                            <select
                                className="form-select"
                                value={variableFormData.salon_id}
                                onChange={(e) => setVariableFormData({ ...variableFormData, salon_id: e.target.value })}
                                required
                            >
                                <option value="">Sélectionner un salon</option>
                                {salons.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={variableFormData.date}
                                onChange={(e) => setVariableFormData({ ...variableFormData, date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Catégorie *</label>
                        <select
                            className="form-select"
                            value={variableFormData.category}
                            onChange={(e) => setVariableFormData({ ...variableFormData, category: e.target.value })}
                        >
                            {categories.filter(c => !c.fixed).map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Montant (€) *</label>
                        <input
                            type="number"
                            className="form-input"
                            value={variableFormData.amount}
                            onChange={(e) => setVariableFormData({ ...variableFormData, amount: e.target.value })}
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            className="form-textarea"
                            value={variableFormData.description}
                            onChange={(e) => setVariableFormData({ ...variableFormData, description: e.target.value })}
                            placeholder="Détails de la dépense..."
                            rows={2}
                        />
                    </div>
                </form>
            </Modal>

            {/* Modal: New Fixed Expense */}
            <Modal
                isOpen={showFixedModal}
                onClose={() => setShowFixedModal(false)}
                title={editing ? 'Modifier la Charge Fixe' : 'Nouvelle Charge Fixe'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowFixedModal(false)}>
                            Annuler
                        </button>
                        <button className="btn btn-primary" onClick={handleSubmitFixed}>
                            {editing ? 'Enregistrer' : 'Créer'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmitFixed}>
                    <div className="form-group">
                        <label className="form-label">Nom de la charge *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={fixedFormData.name}
                            onChange={(e) => setFixedFormData({ ...fixedFormData, name: e.target.value })}
                            placeholder="Ex: Loyer salon Paris"
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Salon *</label>
                            <select
                                className="form-select"
                                value={fixedFormData.salon_id}
                                onChange={(e) => setFixedFormData({ ...fixedFormData, salon_id: e.target.value })}
                                required
                            >
                                <option value="">Sélectionner un salon</option>
                                {salons.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Catégorie *</label>
                            <select
                                className="form-select"
                                value={fixedFormData.category}
                                onChange={(e) => setFixedFormData({ ...fixedFormData, category: e.target.value })}
                            >
                                {categories.filter(c => c.fixed).map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {!editing && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="form-group">
                                <label className="form-label">Montant mensuel (€) *</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={fixedFormData.amount}
                                    onChange={(e) => setFixedFormData({ ...fixedFormData, amount: e.target.value })}
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Applicable à partir de *</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={fixedFormData.effective_from}
                                    onChange={(e) => setFixedFormData({ ...fixedFormData, effective_from: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            className="form-textarea"
                            value={fixedFormData.description}
                            onChange={(e) => setFixedFormData({ ...fixedFormData, description: e.target.value })}
                            placeholder="Détails optionnels..."
                            rows={2}
                        />
                    </div>

                    <div style={{ 
                        background: 'var(--color-info-bg)', 
                        padding: 'var(--space-3)', 
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-info)'
                    }}>
                        <strong>💡 Note:</strong> Cette charge sera automatiquement appliquée à tous les mois suivants. 
                        Vous pourrez modifier le montant à partir d'un mois spécifique sans affecter les mois précédents.
                    </div>
                </form>
            </Modal>

            {/* Modal: Update Amount */}
            <Modal
                isOpen={showAmountModal}
                onClose={() => setShowAmountModal(false)}
                title="Modifier le Montant"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowAmountModal(false)}>
                            Annuler
                        </button>
                        <button className="btn btn-primary" onClick={handleSubmitAmount}>
                            Appliquer
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmitAmount}>
                    {selectedFixedExpense && (
                        <div style={{ 
                            background: 'var(--color-bg-secondary)', 
                            padding: 'var(--space-3)', 
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--space-4)'
                        }}>
                            <strong>{selectedFixedExpense.name}</strong>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                Montant actuel: {formatCurrency(selectedFixedExpense.amount)}
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Nouveau montant (€) *</label>
                        <input
                            type="number"
                            className="form-input"
                            value={amountFormData.amount}
                            onChange={(e) => setAmountFormData({ ...amountFormData, amount: e.target.value })}
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Appliquer à partir de *</label>
                        <input
                            type="date"
                            className="form-input"
                            value={amountFormData.effective_from}
                            onChange={(e) => setAmountFormData({ ...amountFormData, effective_from: e.target.value })}
                            required
                        />
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                            Le nouveau montant sera appliqué à partir de ce mois et pour tous les mois suivants.
                            Les mois précédents garderont l'ancien montant.
                        </p>
                    </div>
                </form>
            </Modal>

            {/* Modal: Amount History */}
            <Modal
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                title="Historique des Montants"
            >
                {selectedFixedExpense && (
                    <div>
                        <div style={{ 
                            background: 'var(--color-bg-secondary)', 
                            padding: 'var(--space-3)', 
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--space-4)'
                        }}>
                            <strong>{selectedFixedExpense.name}</strong>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                {getCategoryLabel(selectedFixedExpense.category)} • {getSalonName(selectedFixedExpense.salon_id)}
                            </div>
                        </div>

                        {amountHistory.length === 0 ? (
                            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-4)' }}>
                                Aucun historique disponible
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                {amountHistory.map((item, index) => (
                                    <div 
                                        key={item.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: 'var(--space-3)',
                                            background: index === 0 ? 'var(--color-success-light)' : 'var(--color-bg-secondary)',
                                            borderRadius: 'var(--radius-md)',
                                            border: index === 0 ? '1px solid var(--color-success)' : 'none'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{formatCurrency(item.amount)}</div>
                                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                                À partir de {formatMonth(item.effective_from)}
                                            </div>
                                        </div>
                                        {index === 0 && (
                                            <span className="badge badge-success">Actuel</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Expenses;
