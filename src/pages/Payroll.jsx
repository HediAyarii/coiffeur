import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Euro,
    Users,
    AlertCircle,
    Check,
    X,
    CreditCard,
    Plus,
    History,
    Banknote,
    FileSpreadsheet,
    TrendingUp,
    TrendingDown,
    DollarSign,
    ChevronDown,
    Filter,
    Download,
    Trash2,
    CheckCircle,
    Clock
} from 'lucide-react';
import { Modal, DataTable } from '../components/UI';
import { salaryCostsAPI, salaryPaymentsAPI } from '../services/api';

const Payroll = () => {
    // Data states
    const [salaryCosts, setSalaryCosts] = useState([]);
    const [availableMonths, setAvailableMonths] = useState([]);

    // Filter states
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [filterStatus, setFilterStatus] = useState('all'); // all, paid, pending, overpaid

    // UI states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // Payment states
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [paymentTotals, setPaymentTotals] = useState({});
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'virement',
        notes: ''
    });

    const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedMonth && selectedYear) {
            loadSalaryCosts();
        }
    }, [selectedMonth, selectedYear]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const monthsData = await salaryCostsAPI.getMonths();
            setAvailableMonths(monthsData);
            await loadSalaryCosts();
        } catch (err) {
            console.error('Error loading initial data:', err);
            setError('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const loadSalaryCosts = async () => {
        try {
            const costsData = await salaryCostsAPI.getAll({ month: selectedMonth, year: selectedYear });
            setSalaryCosts(costsData);
            
            // Load payment totals
            if (costsData.length > 0) {
                const ids = costsData.map(c => c.id);
                const totals = await salaryPaymentsAPI.getTotals(ids);
                setPaymentTotals(totals);
            } else {
                setPaymentTotals({});
            }
        } catch (err) {
            console.error('Error loading salary costs:', err);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount || 0);
    };

    // Calculate reste à payer for an employee
    const calculateResteAPayer = (row) => {
        const charges = parseFloat(row.charges) || 0;
        const taxPercent = parseFloat(row.tax_percentage) || 0;
        const generatedRevenue = parseFloat(row.generated_revenue) || 0;
        const netSalary = parseFloat(row.net_salary) || 0;
        const totalPaid = paymentTotals[row.id] || 0;
        
        let chargeTechnicien = 0;
        if (taxPercent === 0) {
            chargeTechnicien = charges;
        } else if (taxPercent === 50) {
            chargeTechnicien = charges / 2;
        } else if (taxPercent === 100) {
            chargeTechnicien = 0;
        } else {
            chargeTechnicien = charges * (1 - taxPercent / 100);
        }
        
        return Math.max(0, generatedRevenue - chargeTechnicien - netSalary - totalPaid);
    };

    // Get payment status
    const getPaymentStatus = (row) => {
        const resteAPayer = calculateResteAPayer(row);
        const totalPaid = paymentTotals[row.id] || 0;
        
        if (resteAPayer === 0) return 'paid';
        if (totalPaid === 0 && resteAPayer > 0) return 'pending';
        if (resteAPayer > 0) return 'partial';
        return 'paid';
    };

    // Filter data
    const filteredData = salaryCosts.filter(row => {
        if (filterStatus === 'all') return true;
        const status = getPaymentStatus(row);
        if (filterStatus === 'pending') return status === 'pending' || status === 'partial';
        if (filterStatus === 'paid') return status === 'paid';
        if (filterStatus === 'overpaid') return status === 'overpaid';
        return true;
    });

    // Summary calculations
    const summary = {
        totalEmployees: salaryCosts.length,
        totalToPay: salaryCosts.reduce((sum, row) => {
            const reste = calculateResteAPayer(row);
            return sum + Math.max(0, reste);
        }, 0),
        totalPaid: Object.values(paymentTotals).reduce((sum, val) => sum + val, 0),
        pendingCount: salaryCosts.filter(row => ['pending', 'partial'].includes(getPaymentStatus(row))).length,
        paidCount: salaryCosts.filter(row => getPaymentStatus(row) === 'paid').length
    };

    // Payment functions
    const openPaymentModal = (employee) => {
        const resteAPayer = calculateResteAPayer(employee);
        setSelectedEmployee({ ...employee, reste_a_payer: resteAPayer });
        setPaymentForm({
            amount: resteAPayer > 0 ? resteAPayer.toFixed(2) : '',
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'virement',
            notes: ''
        });
        setShowPaymentModal(true);
    };

    const openPaymentHistory = async (employee) => {
        const resteAPayer = calculateResteAPayer(employee);
        setSelectedEmployee({ ...employee, reste_a_payer: resteAPayer });
        try {
            const history = await salaryPaymentsAPI.getBySalaryCost(employee.id);
            setPaymentHistory(history);
            setShowPaymentHistoryModal(true);
        } catch (err) {
            setError('Erreur lors du chargement de l\'historique');
        }
    };

    const handleAddPayment = async () => {
        if (!selectedEmployee || !paymentForm.amount || !paymentForm.payment_date) {
            setError('Veuillez remplir tous les champs obligatoires');
            return;
        }
        
        try {
            await salaryPaymentsAPI.create({
                salary_cost_id: selectedEmployee.id,
                amount: parseFloat(paymentForm.amount),
                payment_date: paymentForm.payment_date,
                payment_method: paymentForm.payment_method,
                notes: paymentForm.notes
            });
            
            setShowPaymentModal(false);
            setSuccess('Paiement enregistré avec succès');
            await loadSalaryCosts();
            
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Erreur lors de l\'enregistrement du paiement');
        }
    };

    const handleDeletePayment = async (paymentId) => {
        if (!confirm('Supprimer ce paiement ?')) return;
        
        try {
            await salaryPaymentsAPI.delete(paymentId);
            const history = await salaryPaymentsAPI.getBySalaryCost(selectedEmployee.id);
            setPaymentHistory(history);
            await loadSalaryCosts();
            setSuccess('Paiement supprimé');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Erreur lors de la suppression');
        }
    };

    if (loading) {
        return (
            <div className="animate-fadeIn" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            {/* Alerts */}
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
                    <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                        <X size={18} />
                    </button>
                </div>
            )}

            {success && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-4)',
                    marginBottom: 'var(--space-4)',
                    background: 'var(--color-success-bg)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--color-success)'
                }}>
                    <Check size={20} />
                    {success}
                </div>
            )}

            {/* Header */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 'var(--space-6)',
                flexWrap: 'wrap',
                gap: 'var(--space-4)'
            }}>
                <div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                        Gestion des Paies
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        Gérez les paiements des salaires pour {monthNames[selectedMonth - 1]} {selectedYear}
                    </p>
                </div>

                {/* Month/Year Selector */}
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                    <select
                        className="form-select"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        style={{ minWidth: 140 }}
                    >
                        {monthNames.map((name, idx) => (
                            <option key={idx} value={idx + 1}>{name}</option>
                        ))}
                    </select>
                    <select
                        className="form-select"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        style={{ minWidth: 100 }}
                    >
                        {[2024, 2025, 2026].map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-4" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--color-primary-100)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Users size={24} style={{ color: 'var(--color-primary-500)' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Employés</div>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{summary.totalEmployees}</div>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--color-warning-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Clock size={24} style={{ color: 'var(--color-warning)' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>En attente</div>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-warning)' }}>
                                {summary.pendingCount}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--color-success-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Payés</div>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-success)' }}>
                                {summary.paidCount}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--color-error-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Euro size={24} style={{ color: 'var(--color-error)' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Reste à payer</div>
                            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-error)' }}>
                                {formatCurrency(summary.totalToPay)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Filter size={18} style={{ color: 'var(--color-text-muted)' }} />
                        <span style={{ fontWeight: 500 }}>Filtrer:</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {[
                            { value: 'all', label: 'Tous', count: salaryCosts.length },
                            { value: 'pending', label: 'En attente', count: summary.pendingCount },
                            { value: 'paid', label: 'Payés', count: summary.paidCount },
                        ].map(filter => (
                            <button
                                key={filter.value}
                                className={`btn btn-sm ${filterStatus === filter.value ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setFilterStatus(filter.value)}
                            >
                                {filter.label} ({filter.count})
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Payroll List */}
            {filteredData.length === 0 ? (
                <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                    <Euro size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: 'var(--space-4)' }} />
                    <h3 style={{ marginBottom: 'var(--space-2)' }}>Aucune donnée</h3>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        {salaryCosts.length === 0 
                            ? 'Importez d\'abord les coûts salariaux dans la section "Coût Salaires"'
                            : 'Aucun résultat pour ce filtre'
                        }
                    </p>
                </div>
            ) : (
                <div className="card">
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--color-bg-secondary)' }}>
                                    <th style={{ padding: 'var(--space-3)', textAlign: 'left' }}>Employé</th>
                                    <th style={{ padding: 'var(--space-3)', textAlign: 'right' }}>Recette Générée</th>
                                    <th style={{ padding: 'var(--space-3)', textAlign: 'right' }}>Salaire Net</th>
                                    <th style={{ padding: 'var(--space-3)', textAlign: 'right' }}>Déjà Payé</th>
                                    <th style={{ padding: 'var(--space-3)', textAlign: 'right' }}>Reste à Payer</th>
                                    <th style={{ padding: 'var(--space-3)', textAlign: 'center' }}>Statut</th>
                                    <th style={{ padding: 'var(--space-3)', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map(row => {
                                    const resteAPayer = calculateResteAPayer(row);
                                    const totalPaid = paymentTotals[row.id] || 0;
                                    const status = getPaymentStatus(row);
                                    
                                    return (
                                        <tr key={row.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: 'var(--space-3)' }}>
                                                <div style={{ fontWeight: 600 }}>{row.last_name} {row.first_name}</div>
                                                {row.matricule && (
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                                        {row.matricule}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                                                <span style={{ color: 'var(--color-accent-400)', fontWeight: 500 }}>
                                                    {formatCurrency(row.generated_revenue)}
                                                </span>
                                            </td>
                                            <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                                                {formatCurrency(row.net_salary)}
                                            </td>
                                            <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                                                <span style={{ 
                                                    color: totalPaid > 0 ? 'var(--color-primary-500)' : 'var(--color-text-muted)',
                                                    fontWeight: totalPaid > 0 ? 600 : 400
                                                }}>
                                                    {formatCurrency(totalPaid)}
                                                </span>
                                            </td>
                                            <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                                                <span style={{ 
                                                    fontWeight: 700, 
                                                    color: resteAPayer > 0 ? 'var(--color-warning)' : 'var(--color-success)',
                                                    background: resteAPayer > 0 ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
                                                    padding: '4px 8px',
                                                    borderRadius: 'var(--radius-md)'
                                                }}>
                                                    {formatCurrency(resteAPayer)}
                                                </span>
                                            </td>
                                            <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                                                {status === 'paid' && (
                                                    <span className="badge badge-success">
                                                        <CheckCircle size={12} /> Payé
                                                    </span>
                                                )}
                                                {status === 'partial' && (
                                                    <span className="badge" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
                                                        <Clock size={12} /> Partiel
                                                    </span>
                                                )}
                                                {status === 'pending' && (
                                                    <span className="badge" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
                                                        <Clock size={12} /> En attente
                                                    </span>
                                                )}
                                                {status === 'overpaid' && (
                                                    <span className="badge" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
                                                        <TrendingUp size={12} /> Trop payé
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        style={{ padding: '6px 12px' }}
                                                        onClick={() => openPaymentModal(row)}
                                                        title="Ajouter un paiement"
                                                    >
                                                        <Plus size={14} />
                                                        Payer
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        style={{ padding: '6px 10px' }}
                                                        onClick={() => openPaymentHistory(row)}
                                                        title="Historique"
                                                    >
                                                        <History size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Totals Footer */}
                    <div style={{
                        padding: 'var(--space-4)',
                        borderTop: '2px solid var(--color-border)',
                        background: 'var(--color-bg-secondary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 'var(--space-4)'
                    }}>
                        <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Total Payé</div>
                                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-primary-500)' }}>
                                    {formatCurrency(summary.totalPaid)}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Reste à Payer</div>
                                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-error)' }}>
                                    {formatCurrency(summary.totalToPay)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title={`Paiement - ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                            Annuler
                        </button>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleAddPayment}
                            disabled={!paymentForm.amount || !paymentForm.payment_date}
                        >
                            <Check size={16} />
                            Valider le paiement
                        </button>
                    </>
                }
            >
                {selectedEmployee && (
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <div style={{
                            padding: 'var(--space-4)',
                            background: selectedEmployee.reste_a_payer >= 0 ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                            borderRadius: 'var(--radius-lg)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                                Reste à payer
                            </div>
                            <div style={{ 
                                fontSize: 'var(--font-size-3xl)', 
                                fontWeight: 700,
                                color: selectedEmployee.reste_a_payer >= 0 ? 'var(--color-success)' : 'var(--color-error)'
                            }}>
                                {formatCurrency(selectedEmployee.reste_a_payer)}
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="form-group">
                    <label className="form-label">Montant du paiement *</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="number"
                            className="form-input"
                            value={paymentForm.amount}
                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            style={{ paddingRight: 40 }}
                        />
                        <span style={{ 
                            position: 'absolute', 
                            right: 12, 
                            top: '50%', 
                            transform: 'translateY(-50%)',
                            color: 'var(--color-text-muted)'
                        }}>€</span>
                    </div>
                </div>
                
                <div className="form-group">
                    <label className="form-label">Date du paiement *</label>
                    <input
                        type="date"
                        className="form-input"
                        value={paymentForm.payment_date}
                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    />
                </div>
                
                <div className="form-group">
                    <label className="form-label">Mode de paiement</label>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {[
                            { value: 'virement', label: 'Virement', icon: CreditCard },
                            { value: 'cheque', label: 'Chèque', icon: FileSpreadsheet },
                            { value: 'especes', label: 'Espèces', icon: Banknote }
                        ].map(method => (
                            <button
                                key={method.value}
                                type="button"
                                className={`btn ${paymentForm.payment_method === method.value ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setPaymentForm({ ...paymentForm, payment_method: method.value })}
                                style={{ flex: 1 }}
                            >
                                <method.icon size={16} />
                                {method.label}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="form-group">
                    <label className="form-label">Notes (optionnel)</label>
                    <textarea
                        className="form-input"
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                        rows={2}
                        placeholder="Référence virement, numéro de chèque..."
                    />
                </div>
            </Modal>

            {/* Payment History Modal */}
            <Modal
                isOpen={showPaymentHistoryModal}
                onClose={() => setShowPaymentHistoryModal(false)}
                title={`Historique - ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`}
                size="lg"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowPaymentHistoryModal(false)}>
                            Fermer
                        </button>
                        <button className="btn btn-primary" onClick={() => {
                            setShowPaymentHistoryModal(false);
                            openPaymentModal(selectedEmployee);
                        }}>
                            <Plus size={16} />
                            Nouveau paiement
                        </button>
                    </>
                }
            >
                {selectedEmployee && (
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-4)',
                            background: 'var(--color-bg-secondary)',
                            borderRadius: 'var(--radius-lg)'
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Recette</div>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-accent-400)' }}>
                                    {formatCurrency(selectedEmployee.generated_revenue)}
                                </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Total payé</div>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-primary-500)' }}>
                                    {formatCurrency(paymentTotals[selectedEmployee.id] || 0)}
                                </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Reste</div>
                                <div style={{ 
                                    fontSize: 'var(--font-size-lg)', 
                                    fontWeight: 700, 
                                    color: selectedEmployee.reste_a_payer >= 0 ? 'var(--color-success)' : 'var(--color-error)'
                                }}>
                                    {formatCurrency(selectedEmployee.reste_a_payer)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {paymentHistory.length > 0 ? (
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--color-bg-secondary)' }}>
                                    <th style={{ padding: 'var(--space-3)', textAlign: 'left' }}>Date</th>
                                    <th style={{ padding: 'var(--space-3)', textAlign: 'left' }}>Méthode</th>
                                    <th style={{ padding: 'var(--space-3)', textAlign: 'right' }}>Montant</th>
                                    <th style={{ padding: 'var(--space-3)', textAlign: 'left' }}>Notes</th>
                                    <th style={{ padding: 'var(--space-3)', textAlign: 'center' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentHistory.map(payment => (
                                    <tr key={payment.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: 'var(--space-3)' }}>
                                            {new Date(payment.payment_date).toLocaleDateString('fr-FR', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td style={{ padding: 'var(--space-3)' }}>
                                            <span className="badge" style={{
                                                background: payment.payment_method === 'virement' ? 'var(--color-info-bg)' :
                                                           payment.payment_method === 'cheque' ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
                                                color: payment.payment_method === 'virement' ? 'var(--color-info)' :
                                                       payment.payment_method === 'cheque' ? 'var(--color-warning)' : 'var(--color-success)'
                                            }}>
                                                {payment.payment_method === 'virement' ? 'Virement' :
                                                 payment.payment_method === 'cheque' ? 'Chèque' : 'Espèces'}
                                            </span>
                                        </td>
                                        <td style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>
                                            +{formatCurrency(payment.amount)}
                                        </td>
                                        <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                            {payment.notes || '—'}
                                        </td>
                                        <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                                            <button
                                                className="btn btn-sm"
                                                style={{ 
                                                    padding: '4px 8px', 
                                                    background: 'var(--color-error-bg)', 
                                                    color: 'var(--color-error)',
                                                    border: 'none',
                                                    borderRadius: 'var(--radius-md)',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => handleDeletePayment(payment.id)}
                                                title="Supprimer"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
                        <History size={48} style={{ opacity: 0.3, marginBottom: 'var(--space-4)' }} />
                        <p>Aucun paiement enregistré</p>
                        <p style={{ fontSize: 'var(--font-size-sm)' }}>Cliquez sur "Nouveau paiement" pour commencer</p>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Payroll;
