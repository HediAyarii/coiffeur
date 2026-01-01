import React, { useState, useEffect, useRef } from 'react';
import {
    Upload,
    FileSpreadsheet,
    Calendar,
    Users,
    Euro,
    AlertCircle,
    Check,
    Trash2,
    Download,
    RefreshCw,
    ChevronDown,
    DollarSign,
    TrendingUp,
    UserCheck,
    X,
    CreditCard,
    Plus,
    History,
    Banknote
} from 'lucide-react';
import { Modal, DataTable } from '../components/UI';
import { salaryCostsAPI, hairdressersAPI, salaryPaymentsAPI } from '../services/api';

const SalaryCosts = () => {
    // Data states
    const [salaryCosts, setSalaryCosts] = useState([]);
    const [hairdressers, setHairdressers] = useState([]);
    const [availableMonths, setAvailableMonths] = useState([]);
    const [summary, setSummary] = useState(null);

    // Filter states
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // UI states
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [csvPreview, setCsvPreview] = useState([]);
    
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

    const fileInputRef = useRef(null);

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
            const [hairdressersData, monthsData] = await Promise.all([
                hairdressersAPI.getAll(),
                salaryCostsAPI.getMonths()
            ]);
            setHairdressers(hairdressersData);
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
            const [costsData, summaryData] = await Promise.all([
                salaryCostsAPI.getAll({ month: selectedMonth, year: selectedYear }),
                salaryCostsAPI.getSummary(selectedMonth, selectedYear)
            ]);
            setSalaryCosts(costsData);
            setSummary(summaryData);
            
            // Load payment totals for all salary costs
            if (costsData.length > 0) {
                const ids = costsData.map(c => c.id);
                const totals = await salaryPaymentsAPI.getTotals(ids);
                setPaymentTotals(totals);
            }
        } catch (err) {
            console.error('Error loading salary costs:', err);
        }
    };
    
    // Payment functions
    const openPaymentModal = (employee, resteAPayer) => {
        setSelectedEmployee({ ...employee, reste_a_payer: resteAPayer });
        setPaymentForm({
            amount: resteAPayer > 0 ? resteAPayer.toFixed(2) : '',
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'virement',
            notes: ''
        });
        setShowPaymentModal(true);
    };
    
    const openPaymentHistory = async (employee, resteAPayer) => {
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

    const parseCSV = (text) => {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return [];

        // Detect separator (tab or semicolon or comma)
        const firstLine = lines[0];
        let separator = '\t';
        if (firstLine.includes(';')) separator = ';';
        else if (firstLine.includes(',') && !firstLine.includes('\t')) separator = ',';

        const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
        
        // Map French headers to our fields
        const headerMap = {
            'nom': 'last_name',
            'prénom': 'first_name',
            'prenom': 'first_name',
            'salaire net (€)': 'net_salary',
            'salaire net': 'net_salary',
            'net': 'net_salary',
            'salaire brut (€)': 'gross_salary',
            'salaire brut': 'gross_salary',
            'brut': 'gross_salary',
            'coût total (€)': 'total_cost',
            'coût total': 'total_cost',
            'cout total': 'total_cost',
            'total': 'total_cost',
            'charge': 'charges',
            'charges': 'charges'
        };

        const mappedHeaders = headers.map(h => headerMap[h] || h);

        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(separator).map(v => v.trim());
            if (values.length >= 2 && values[0]) {
                const row = {};
                mappedHeaders.forEach((header, idx) => {
                    let value = values[idx] || '';
                    // Convert French decimal format (1 234,56) to standard (1234.56)
                    if (['net_salary', 'gross_salary', 'total_cost', 'charges'].includes(header)) {
                        value = value.replace(/\s/g, '').replace(',', '.');
                    }
                    row[header] = value;
                });
                if (row.last_name && row.first_name) {
                    data.push(row);
                }
            }
        }

        return data;
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const parsed = parseCSV(text);
            setCsvPreview(parsed);
            setShowImportModal(true);
        };
        reader.readAsText(file, 'UTF-8');
        
        // Reset input
        event.target.value = '';
    };

    const handleImport = async () => {
        if (csvPreview.length === 0) return;

        try {
            setImporting(true);
            setError(null);

            const result = await salaryCostsAPI.import({
                month: selectedMonth,
                year: selectedYear,
                data: csvPreview
            });

            setSuccess(`${result.imported} salaires importés avec succès pour ${monthNames[selectedMonth - 1]} ${selectedYear}`);
            setShowImportModal(false);
            setCsvPreview([]);
            await loadSalaryCosts();
            
            // Refresh available months
            const monthsData = await salaryCostsAPI.getMonths();
            setAvailableMonths(monthsData);

        } catch (err) {
            setError('Erreur lors de l\'import: ' + (err.message || 'Erreur inconnue'));
        } finally {
            setImporting(false);
        }
    };

    const handleDeleteMonth = async () => {
        try {
            await salaryCostsAPI.deleteMonth(selectedYear, selectedMonth);
            setSuccess(`Données de ${monthNames[selectedMonth - 1]} ${selectedYear} supprimées`);
            setShowDeleteModal(false);
            await loadSalaryCosts();
            
            const monthsData = await salaryCostsAPI.getMonths();
            setAvailableMonths(monthsData);
        } catch (err) {
            setError('Erreur lors de la suppression');
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('fr-FR', { 
            style: 'currency', 
            currency: 'EUR',
            minimumFractionDigits: 2 
        }).format(value || 0);
    };

    // Generate year options (last 5 years + current + next)
    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let y = currentYear + 1; y >= currentYear - 5; y--) {
        yearOptions.push(y);
    }

    const columns = [
        {
            key: 'name',
            header: 'Employé',
            render: (row) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{row.last_name} {row.first_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 4 }}>
                        {row.hairdresser_id ? (
                            <span className="badge badge-success" style={{ fontSize: '10px' }}>
                                <UserCheck size={10} /> Lié
                            </span>
                        ) : (
                            <span className="badge" style={{ fontSize: '10px', background: 'var(--color-bg-tertiary)' }}>
                                Non lié
                            </span>
                        )}
                    </div>
                </div>
            )
        },
        {
            key: 'tax_percentage',
            header: 'Taxe',
            render: (row) => (
                row.tax_percentage !== null && row.tax_percentage !== undefined ? (
                    <span style={{ 
                        fontWeight: 600, 
                        color: 'var(--color-warning)',
                        background: 'rgba(245, 158, 11, 0.1)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        {parseFloat(row.tax_percentage).toFixed(2)}%
                    </span>
                ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                )
            )
        },
        {
            key: 'generated_revenue',
            header: 'Recette Générée',
            render: (row) => (
                <div>
                    <span style={{ 
                        fontWeight: 600, 
                        color: row.generated_revenue > 0 ? 'var(--color-accent-400)' : 'var(--color-text-muted)'
                    }}>
                        {formatCurrency(row.generated_revenue)}
                    </span>
                    {row.service_count > 0 && (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                            {row.service_count} services
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'net_salary',
            header: 'Salaire Net',
            render: (row) => (
                <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                    {formatCurrency(row.net_salary)}
                </span>
            )
        },
        {
            key: 'gross_salary',
            header: 'Salaire Brut',
            render: (row) => formatCurrency(row.gross_salary)
        },
        {
            key: 'total_cost',
            header: 'Coût Total',
            render: (row) => (
                <span style={{ fontWeight: 600, color: 'var(--color-primary-500)' }}>
                    {formatCurrency(row.total_cost)}
                </span>
            )
        },
        {
            key: 'charges',
            header: 'Charges',
            render: (row) => (
                <span style={{ color: 'var(--color-error)' }}>
                    {formatCurrency(row.charges)}
                </span>
            )
        },
        {
            key: 'charge_technicien',
            header: 'Charge Technicien',
            render: (row) => {
                const charges = parseFloat(row.charges) || 0;
                const taxPercent = parseFloat(row.tax_percentage) || 0;
                
                let chargeTechnicien = 0;
                if (taxPercent === 0) {
                    chargeTechnicien = charges; // 0% taxe = 100% de la charge
                } else if (taxPercent === 50) {
                    chargeTechnicien = charges / 2; // 50% taxe = moitié de la charge
                } else if (taxPercent === 100) {
                    chargeTechnicien = 0; // 100% taxe = 0 charge
                } else {
                    // Formule générale: charge * (1 - taxPercent/100)
                    chargeTechnicien = charges * (1 - taxPercent / 100);
                }
                
                return (
                    <span style={{ 
                        fontWeight: 600, 
                        color: chargeTechnicien > 0 ? 'var(--color-warning)' : 'var(--color-success)'
                    }}>
                        {formatCurrency(chargeTechnicien)}
                    </span>
                );
            }
        },
        {
            key: 'reste_a_payer',
            header: 'Reste à Payer',
            render: (row) => {
                const charges = parseFloat(row.charges) || 0;
                const taxPercent = parseFloat(row.tax_percentage) || 0;
                const generatedRevenue = parseFloat(row.generated_revenue) || 0;
                const netSalary = parseFloat(row.net_salary) || 0;
                const totalPaid = paymentTotals[row.id] || 0;
                
                // Calcul de la charge technicien
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
                
                // Reste à payer = Recette Générée - Charge Technicien - Salaire Net - Paiements effectués
                const resteAPayer = Math.max(0, generatedRevenue - chargeTechnicien - netSalary - totalPaid);
                
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <div>
                            <span style={{ 
                                fontWeight: 700, 
                                color: resteAPayer > 0 ? 'var(--color-warning)' : 'var(--color-success)',
                                background: resteAPayer > 0 ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                {formatCurrency(resteAPayer)}
                            </span>
                            {totalPaid > 0 && (
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                    Payé: {formatCurrency(totalPaid)}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                            <button
                                className="btn btn-sm"
                                style={{ 
                                    padding: '4px 8px', 
                                    background: 'var(--color-primary-500)', 
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer'
                                }}
                                onClick={() => openPaymentModal(row, resteAPayer)}
                                title="Ajouter un paiement"
                            >
                                <Plus size={14} />
                            </button>
                            <button
                                className="btn btn-sm"
                                style={{ 
                                    padding: '4px 8px', 
                                    background: 'var(--color-bg-tertiary)', 
                                    color: 'var(--color-text-secondary)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer'
                                }}
                                onClick={() => openPaymentHistory(row, resteAPayer)}
                                title="Historique des paiements"
                            >
                                <History size={14} />
                            </button>
                        </div>
                    </div>
                );
            }
        }
    ];

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
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--color-success)'
                }}>
                    <Check size={20} />
                    {success}
                    <button onClick={() => setSuccess(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Coût Salaires</h1>
                    <p className="page-subtitle">Importez et gérez les coûts salariaux mensuels</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept=".csv,.txt"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    <button 
                        className="btn btn-primary"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload size={18} />
                        Importer CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    flexWrap: 'wrap',
                    gap: 'var(--space-4)'
                }}>
                    <div>
                        <label className="form-label">Mois</label>
                        <select
                            className="form-select"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            style={{ minWidth: '150px' }}
                        >
                            {monthNames.map((name, idx) => (
                                <option key={idx} value={idx + 1}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="form-label">Année</label>
                        <select
                            className="form-select"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            style={{ minWidth: '100px' }}
                        >
                            {yearOptions.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <button 
                        className="btn btn-secondary"
                        onClick={loadSalaryCosts}
                    >
                        <RefreshCw size={16} />
                        Actualiser
                    </button>

                    {salaryCosts.length > 0 && (
                        <button 
                            className="btn btn-ghost"
                            onClick={() => setShowDeleteModal(true)}
                            style={{ color: 'var(--color-error)' }}
                        >
                            <Trash2 size={16} />
                            Supprimer ce mois
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            {summary && summary.total_employees > 0 && (
                <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                            <Users size={24} style={{ color: 'var(--color-primary-500)' }} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{summary.total_employees}</div>
                            <div className="stat-label">Employés</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                            <Euro size={24} style={{ color: 'var(--color-success)' }} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{formatCurrency(summary.total_net)}</div>
                            <div className="stat-label">Total Net</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                            <DollarSign size={24} style={{ color: 'var(--color-accent-400)' }} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{formatCurrency(summary.total_gross)}</div>
                            <div className="stat-label">Total Brut</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                            <TrendingUp size={24} style={{ color: 'var(--color-error)' }} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{formatCurrency(summary.total_cost)}</div>
                            <div className="stat-label">Coût Total</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Data Table */}
            {salaryCosts.length > 0 ? (
                <div className="card">
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
                            Détail des salaires - {monthNames[selectedMonth - 1]} {selectedYear}
                        </h3>
                    </div>
                    <DataTable
                        data={salaryCosts}
                        columns={columns}
                    />
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                    <FileSpreadsheet size={48} style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }} />
                    <h3 style={{ marginBottom: 'var(--space-2)' }}>Aucune donnée pour {monthNames[selectedMonth - 1]} {selectedYear}</h3>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                        Importez un fichier CSV pour ajouter les données salariales de ce mois.
                    </p>
                    <button 
                        className="btn btn-primary"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload size={18} />
                        Importer CSV
                    </button>
                </div>
            )}

            {/* Import Preview Modal */}
            <Modal
                isOpen={showImportModal}
                onClose={() => { setShowImportModal(false); setCsvPreview([]); }}
                title={`Importer les salaires - ${monthNames[selectedMonth - 1]} ${selectedYear}`}
                size="large"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => { setShowImportModal(false); setCsvPreview([]); }}>
                            Annuler
                        </button>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleImport}
                            disabled={importing || csvPreview.length === 0}
                        >
                            {importing ? (
                                <>
                                    <RefreshCw size={16} className="spinning" />
                                    Import en cours...
                                </>
                            ) : (
                                <>
                                    <Upload size={16} />
                                    Importer {csvPreview.length} lignes
                                </>
                            )}
                        </button>
                    </>
                }
            >
                {csvPreview.length > 0 ? (
                    <div>
                        <div style={{ 
                            padding: 'var(--space-3)', 
                            background: 'rgba(59, 130, 246, 0.1)', 
                            borderRadius: 'var(--radius-lg)',
                            marginBottom: 'var(--space-4)'
                        }}>
                            <strong>{csvPreview.length}</strong> lignes détectées. 
                            Les données existantes pour ce mois seront remplacées.
                        </div>
                        
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                <thead>
                                    <tr style={{ background: 'var(--color-bg-secondary)' }}>
                                        <th style={{ padding: 'var(--space-2)', textAlign: 'left' }}>Nom</th>
                                        <th style={{ padding: 'var(--space-2)', textAlign: 'left' }}>Prénom</th>
                                        <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>Net</th>
                                        <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>Brut</th>
                                        <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>Coût Total</th>
                                        <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>Charges</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {csvPreview.map((row, idx) => (
                                        <tr key={idx} style={{ borderTop: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: 'var(--space-2)' }}>{row.last_name}</td>
                                            <td style={{ padding: 'var(--space-2)' }}>{row.first_name}</td>
                                            <td style={{ padding: 'var(--space-2)', textAlign: 'right' }}>{formatCurrency(row.net_salary)}</td>
                                            <td style={{ padding: 'var(--space-2)', textAlign: 'right' }}>{formatCurrency(row.gross_salary)}</td>
                                            <td style={{ padding: 'var(--space-2)', textAlign: 'right' }}>{formatCurrency(row.total_cost)}</td>
                                            <td style={{ padding: 'var(--space-2)', textAlign: 'right' }}>{formatCurrency(row.charges)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <p>Aucune donnée valide détectée dans le fichier.</p>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Confirmer la suppression"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                            Annuler
                        </button>
                        <button className="btn btn-primary" onClick={handleDeleteMonth} style={{ background: 'var(--color-error)' }}>
                            <Trash2 size={16} />
                            Supprimer
                        </button>
                    </>
                }
            >
                <p>
                    Êtes-vous sûr de vouloir supprimer toutes les données salariales de <strong>{monthNames[selectedMonth - 1]} {selectedYear}</strong> ?
                </p>
                <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
                    Cette action est irréversible.
                </p>
            </Modal>
            
            {/* Payment Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title={`Ajouter un paiement - ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`}
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
                            Enregistrer
                        </button>
                    </>
                }
            >
                {selectedEmployee && (
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <div style={{
                            padding: 'var(--space-3)',
                            background: selectedEmployee.reste_a_payer >= 0 ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                            borderRadius: 'var(--radius-lg)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                Reste à payer
                            </div>
                            <div style={{ 
                                fontSize: 'var(--font-size-2xl)', 
                                fontWeight: 700,
                                color: selectedEmployee.reste_a_payer >= 0 ? 'var(--color-success)' : 'var(--color-error)'
                            }}>
                                {formatCurrency(selectedEmployee.reste_a_payer)}
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="form-group">
                    <label className="form-label">Montant *</label>
                    <input
                        type="number"
                        className="form-input"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                    />
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
                    <label className="form-label">Notes</label>
                    <textarea
                        className="form-input"
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                        rows={2}
                        placeholder="Notes optionnelles..."
                    />
                </div>
            </Modal>
            
            {/* Payment History Modal */}
            <Modal
                isOpen={showPaymentHistoryModal}
                onClose={() => setShowPaymentHistoryModal(false)}
                title={`Historique des paiements - ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`}
                size="lg"
                footer={
                    <button className="btn btn-secondary" onClick={() => setShowPaymentHistoryModal(false)}>
                        Fermer
                    </button>
                }
            >
                {selectedEmployee && (
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <div style={{
                            display: 'flex',
                            gap: 'var(--space-4)',
                            padding: 'var(--space-3)',
                            background: 'var(--color-bg-secondary)',
                            borderRadius: 'var(--radius-lg)'
                        }}>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Total payé</div>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-primary-500)' }}>
                                    {formatCurrency(paymentTotals[selectedEmployee.id] || 0)}
                                </div>
                            </div>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Reste à payer</div>
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
                                    <th style={{ padding: 'var(--space-3)', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentHistory.map(payment => (
                                    <tr key={payment.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: 'var(--space-3)' }}>
                                            {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
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
                                        <td style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600 }}>
                                            {formatCurrency(payment.amount)}
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
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default SalaryCosts;
