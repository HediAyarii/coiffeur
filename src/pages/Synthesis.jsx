import React, { useState, useEffect } from 'react';
import { TrendingUp, CreditCard, Wallet, Receipt, RefreshCw, Calculator, PiggyBank, Banknote } from 'lucide-react';
import { synthesisAPI, salonsAPI } from '../services/api';

const Synthesis = () => {
    const [synthesisData, setSynthesisData] = useState([]);
    const [salons, setSalons] = useState([]);
    const [declaredCash, setDeclaredCash] = useState({});
    const [beneficeData, setBeneficeData] = useState(null);
    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState(() => {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingCash, setEditingCash] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            loadSynthesis();
        }
    }, [startDate, endDate]);

    const loadData = async () => {
        try {
            setLoading(true);
            const salonsData = await salonsAPI.getAll();
            setSalons(salonsData.filter(s => s.is_active));
            await loadSynthesis();
        } catch (err) {
            console.error('Error loading data:', err);
            setError('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const loadSynthesis = async () => {
        try {
            const data = await synthesisAPI.getSynthesis(startDate, endDate);
            setSynthesisData(data);

            // Use start date month for declared cash
            const declaredMonth = startDate.slice(0, 7);
            const cashPromises = data.map(salon =>
                synthesisAPI.getDeclaredCash(salon.salon_id, declaredMonth)
            );
            const cashData = await Promise.all(cashPromises);
            
            const cashMap = {};
            cashData.forEach(cash => {
                cashMap[cash.salon_id] = cash;
            });
            setDeclaredCash(cashMap);
            
            // Load benefice data
            try {
                const benefice = await synthesisAPI.getBenefice(startDate, endDate);
                setBeneficeData(benefice);
            } catch (beneficeErr) {
                console.error('Error loading benefice:', beneficeErr);
                setBeneficeData(null);
            }
        } catch (err) {
            console.error('Error loading synthesis:', err);
            setError('Erreur lors du chargement de la synthèse');
        }
    };

    const handleDeclaredCashChange = (salonId, value) => {
        setEditingCash({
            ...editingCash,
            [salonId]: value
        });
    };

    const handleSaveDeclaredCash = async (salonId) => {
        try {
            const amount = parseFloat(editingCash[salonId]) || 0;
            const declaredMonth = startDate.slice(0, 7);
            await synthesisAPI.updateDeclaredCash(salonId, declaredMonth, amount);
            await loadSynthesis();
            setEditingCash({
                ...editingCash,
                [salonId]: undefined
            });
        } catch (err) {
            console.error('Error saving declared cash:', err);
            setError('Erreur lors de la sauvegarde');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount || 0);
    };

    const totals = synthesisData.reduce((acc, salon) => {
        const cash = declaredCash[salon.salon_id] || {};
        return {
            ca_cash: acc.ca_cash + parseFloat(salon.ca_cash || 0),
            ca_card: acc.ca_card + parseFloat(salon.ca_card || 0),
            ca_total: acc.ca_total + parseFloat(salon.ca_total || 0),
            vat_on_card: acc.vat_on_card + parseFloat(salon.vat_on_card || 0),
            vat_recoverable: acc.vat_recoverable + parseFloat(salon.vat_recoverable || 0),
            declared_cash: acc.declared_cash + parseFloat(cash.declared_amount || 0),
            vat_on_declared: acc.vat_on_declared + parseFloat(cash.vat_amount || 0)
        };
    }, {
        ca_cash: 0,
        ca_card: 0,
        ca_total: 0,
        vat_on_card: 0,
        vat_recoverable: 0,
        declared_cash: 0,
        vat_on_declared: 0
    });

    const totalVatToPay = totals.vat_on_declared + totals.vat_on_card - totals.vat_recoverable;

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
                    <h1 className="page-title">Synthèse Mensuelle</h1>
                    <p className="page-subtitle">Vue d'ensemble du CA et de la TVA par salon</p>
                </div>
                <div className="page-header-actions">
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Date début</label>
                            <input
                                type="date"
                                className="form-input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{ width: '150px' }}
                            />
                        </div>
                        <span style={{ color: 'var(--color-text-muted)', marginTop: '24px' }}>à</span>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Date fin</label>
                            <input
                                type="date"
                                className="form-input"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{ width: '150px' }}
                            />
                        </div>
                    </div>
                    <button className="btn btn-secondary" onClick={loadSynthesis}>
                        <RefreshCw size={18} />
                        <span className="hide-mobile">Actualiser</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                    {error}
                    <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            {/* Summary Cards */}
            <div className="synthesis-cards">
                <div className="stat-card">
                    <div className="stat-card-icon green">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-card-value" style={{ marginTop: 'var(--space-4)', color: 'var(--color-success)' }}>
                        {formatCurrency(totals.ca_total)}
                    </div>
                    <div className="stat-card-label">CA Total</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon blue">
                        <CreditCard size={24} />
                    </div>
                    <div className="stat-card-value" style={{ marginTop: 'var(--space-4)' }}>
                        {formatCurrency(totals.ca_card)}
                    </div>
                    <div className="stat-card-label">CA Carte Bancaire</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon gold">
                        <Wallet size={24} />
                    </div>
                    <div className="stat-card-value" style={{ marginTop: 'var(--space-4)' }}>
                        {formatCurrency(totals.ca_cash)}
                    </div>
                    <div className="stat-card-label">CA Espèces</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon purple">
                        <Receipt size={24} />
                    </div>
                    <div className="stat-card-value" style={{ marginTop: 'var(--space-4)', color: 'var(--color-success)' }}>
                        {formatCurrency(totals.vat_recoverable)}
                    </div>
                    <div className="stat-card-label">TVA Récupérable</div>
                </div>
            </div>

            {/* Main Table */}
            <div className="card">
                <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>
                    <Calculator size={20} style={{ marginRight: 'var(--space-2)' }} />
                    Détail par Salon - du {startDate} au {endDate}
                </h3>

                {/* Desktop Table */}
                <div className="synthesis-table-container hide-mobile">
                    <table className="synthesis-table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Salon</th>
                                <th style={{ textAlign: 'right' }}>CA Espèces</th>
                                <th style={{ textAlign: 'right' }}>CA CB</th>
                                <th style={{ textAlign: 'right' }}>CA Général</th>
                                <th style={{ textAlign: 'right' }}>TVA sur CB</th>
                                <th style={{ textAlign: 'right' }}>TVA Récup.</th>
                                <th style={{ textAlign: 'right' }}>Esp. Déclaré</th>
                                <th style={{ textAlign: 'right' }}>TVA Déclaré</th>
                                <th style={{ textAlign: 'right' }}>TVA à payer</th>
                            </tr>
                        </thead>
                        <tbody>
                            {synthesisData.map(salon => {
                                const cash = declaredCash[salon.salon_id] || {};
                                const isEditing = editingCash[salon.salon_id] !== undefined;
                                const vatToPay = parseFloat(cash.vat_amount || 0) + parseFloat(salon.vat_on_card || 0) - parseFloat(salon.vat_recoverable || 0);
                                
                                return (
                                    <tr key={salon.salon_id}>
                                        <td style={{ fontWeight: 600 }}>{salon.salon_name}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--color-warning)' }}>
                                            {formatCurrency(salon.ca_cash)}
                                        </td>
                                        <td style={{ textAlign: 'right', color: 'var(--color-info)' }}>
                                            {formatCurrency(salon.ca_card)}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>
                                            {formatCurrency(salon.ca_total)}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {formatCurrency(salon.vat_on_card)}
                                        </td>
                                        <td style={{ textAlign: 'right', color: 'var(--color-success)' }}>
                                            {formatCurrency(salon.vat_recoverable)}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {isEditing ? (
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={editingCash[salon.salon_id]}
                                                        onChange={(e) => handleDeclaredCashChange(salon.salon_id, e.target.value)}
                                                        step="0.01"
                                                        min="0"
                                                        style={{ width: '90px', textAlign: 'right', padding: '4px 8px' }}
                                                        autoFocus
                                                    />
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => handleSaveDeclaredCash(salon.salon_id)}
                                                        style={{ padding: '4px 8px', minWidth: 'auto' }}
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => setEditingCash({ ...editingCash, [salon.salon_id]: undefined })}
                                                        style={{ padding: '4px 8px', minWidth: 'auto' }}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <span
                                                    onClick={() => handleDeclaredCashChange(salon.salon_id, cash.declared_amount || 0)}
                                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                    title="Cliquer pour modifier"
                                                >
                                                    {formatCurrency(cash.declared_amount)}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                                            {formatCurrency(cash.vat_amount)}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: vatToPay >= 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                            {formatCurrency(vatToPay)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td style={{ fontWeight: 700 }}>TOTAL</td>
                                <td style={{ textAlign: 'right', color: 'var(--color-warning)', fontWeight: 700 }}>
                                    {formatCurrency(totals.ca_cash)}
                                </td>
                                <td style={{ textAlign: 'right', color: 'var(--color-info)', fontWeight: 700 }}>
                                    {formatCurrency(totals.ca_card)}
                                </td>
                                <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 700 }}>
                                    {formatCurrency(totals.ca_total)}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                    {formatCurrency(totals.vat_on_card)}
                                </td>
                                <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 700 }}>
                                    {formatCurrency(totals.vat_recoverable)}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                    {formatCurrency(totals.declared_cash)}
                                </td>
                                <td style={{ textAlign: 'right', fontStyle: 'italic', fontWeight: 700 }}>
                                    {formatCurrency(totals.vat_on_declared)}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: totalVatToPay >= 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                    {formatCurrency(totalVatToPay)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Mobile Cards View */}
                <div className="show-mobile">
                    {synthesisData.map(salon => {
                        const cash = declaredCash[salon.salon_id] || {};
                        const isEditing = editingCash[salon.salon_id] !== undefined;
                        const vatToPay = parseFloat(cash.vat_amount || 0) + parseFloat(salon.vat_on_card || 0) - parseFloat(salon.vat_recoverable || 0);
                        
                        return (
                            <div key={salon.salon_id} className="synthesis-mobile-card">
                                <div className="synthesis-mobile-card-header">{salon.salon_name}</div>
                                <div className="synthesis-mobile-card-row">
                                    <span className="synthesis-mobile-card-label">CA Espèces</span>
                                    <span className="synthesis-mobile-card-value" style={{ color: 'var(--color-warning)' }}>
                                        {formatCurrency(salon.ca_cash)}
                                    </span>
                                </div>
                                <div className="synthesis-mobile-card-row">
                                    <span className="synthesis-mobile-card-label">CA CB</span>
                                    <span className="synthesis-mobile-card-value" style={{ color: 'var(--color-info)' }}>
                                        {formatCurrency(salon.ca_card)}
                                    </span>
                                </div>
                                <div className="synthesis-mobile-card-row">
                                    <span className="synthesis-mobile-card-label">CA Général</span>
                                    <span className="synthesis-mobile-card-value" style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                                        {formatCurrency(salon.ca_total)}
                                    </span>
                                </div>
                                <div className="synthesis-mobile-card-row">
                                    <span className="synthesis-mobile-card-label">TVA Récupérable</span>
                                    <span className="synthesis-mobile-card-value" style={{ color: 'var(--color-success)' }}>
                                        {formatCurrency(salon.vat_recoverable)}
                                    </span>
                                </div>
                                <div className="synthesis-mobile-card-row">
                                    <span className="synthesis-mobile-card-label">Espèces Déclaré</span>
                                    {isEditing ? (
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={editingCash[salon.salon_id]}
                                                onChange={(e) => handleDeclaredCashChange(salon.salon_id, e.target.value)}
                                                step="0.01"
                                                min="0"
                                                style={{ width: '80px', textAlign: 'right', padding: '4px 8px' }}
                                                autoFocus
                                            />
                                            <button className="btn btn-sm btn-primary" onClick={() => handleSaveDeclaredCash(salon.salon_id)} style={{ padding: '4px 8px', minWidth: 'auto' }}>✓</button>
                                            <button className="btn btn-sm btn-secondary" onClick={() => setEditingCash({ ...editingCash, [salon.salon_id]: undefined })} style={{ padding: '4px 8px', minWidth: 'auto' }}>✕</button>
                                        </div>
                                    ) : (
                                        <span
                                            className="synthesis-mobile-card-value"
                                            onClick={() => handleDeclaredCashChange(salon.salon_id, cash.declared_amount || 0)}
                                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                        >
                                            {formatCurrency(cash.declared_amount)}
                                        </span>
                                    )}
                                </div>
                                <div className="synthesis-mobile-card-row synthesis-mobile-card-total">
                                    <span className="synthesis-mobile-card-label">TVA à payer</span>
                                    <span className="synthesis-mobile-card-value" style={{ fontWeight: 700, color: vatToPay >= 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                        {formatCurrency(vatToPay)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {/* Total Card */}
                    <div className="synthesis-mobile-card synthesis-mobile-card-highlight">
                        <div className="synthesis-mobile-card-header">TOTAL GÉNÉRAL</div>
                        <div className="synthesis-mobile-card-row">
                            <span className="synthesis-mobile-card-label">CA Total</span>
                            <span className="synthesis-mobile-card-value" style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                                {formatCurrency(totals.ca_total)}
                            </span>
                        </div>
                        <div className="synthesis-mobile-card-row">
                            <span className="synthesis-mobile-card-label">TVA Récupérable</span>
                            <span className="synthesis-mobile-card-value" style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                                {formatCurrency(totals.vat_recoverable)}
                            </span>
                        </div>
                        <div className="synthesis-mobile-card-row synthesis-mobile-card-total">
                            <span className="synthesis-mobile-card-label" style={{ fontSize: '1rem' }}>TVA à payer</span>
                            <span className="synthesis-mobile-card-value" style={{ fontWeight: 700, fontSize: '1.125rem', color: totalVatToPay >= 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                {formatCurrency(totalVatToPay)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="synthesis-note">
                    <strong>💡 Note :</strong>
                    <ul>
                        <li>Les CA sont calculés automatiquement depuis les transactions</li>
                        <li>La TVA sur CB est calculée automatiquement (20%)</li>
                        <li><strong>Espèces Déclaré</strong> : Cliquez pour modifier</li>
                        <li>TVA à payer = (TVA Déclaré + TVA CB) - TVA Récupérable</li>
                    </ul>
                </div>
            </div>

            {/* Synthèse Bénéfice Section */}
            {beneficeData && (
                <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                    <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>
                        <PiggyBank size={20} style={{ marginRight: 'var(--space-2)' }} />
                        Synthèse Bénéfice - du {startDate} au {endDate}
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
                        {/* CB Bénéfice */}
                        <div style={{ 
                            background: 'var(--color-bg-secondary)', 
                            borderRadius: 'var(--radius-lg)', 
                            padding: 'var(--space-5)',
                            border: '1px solid var(--color-border)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                                <CreditCard size={20} style={{ color: 'var(--color-info)' }} />
                                <h4 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Bénéfice CB</h4>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Total CB</span>
                                    <span style={{ fontWeight: 600 }}>{formatCurrency(beneficeData.total_cb)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-error)' }}>
                                    <span>- TVA CB</span>
                                    <span>{formatCurrency(beneficeData.tva_cb)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-error)' }}>
                                    <span>- TVA Espèces</span>
                                    <span>{formatCurrency(beneficeData.tva_especes)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-error)' }}>
                                    <span>- Salaires par virement</span>
                                    <span>{formatCurrency(beneficeData.total_virement)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-error)' }}>
                                    <span>- Salaires par chèque</span>
                                    <span>{formatCurrency(beneficeData.total_cheque)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-error)' }}>
                                    <span>- Charges fixes</span>
                                    <span>{formatCurrency(beneficeData.charges_fixes)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-error)' }}>
                                    <span>- Charges variables</span>
                                    <span>{formatCurrency(beneficeData.charges_variables)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-error)' }}>
                                    <span>- Charges entreprise (taxe)</span>
                                    <span>{formatCurrency(beneficeData.charges_entreprise)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)' }}>
                                    <span>+ TVA Récupérable</span>
                                    <span>{formatCurrency(beneficeData.tva_recuperable)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)' }}>
                                    <span>+ Ventes Produits CB</span>
                                    <span>{formatCurrency(beneficeData.ventes_produits_cb)}</span>
                                </div>
                                {beneficeData.salaire_negatif > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-error)' }}>
                                        <span>- Salaires négatifs</span>
                                        <span>{formatCurrency(beneficeData.salaire_negatif)}</span>
                                    </div>
                                )}
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    paddingTop: 'var(--space-3)',
                                    marginTop: 'var(--space-2)',
                                    borderTop: '2px solid var(--color-border)',
                                    fontWeight: 700,
                                    fontSize: 'var(--font-size-lg)'
                                }}>
                                    <span>= CB Bénéfice</span>
                                    <span style={{ color: beneficeData.cb_benefice >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                                        {formatCurrency(beneficeData.cb_benefice)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Espèces Bénéfice */}
                        <div style={{ 
                            background: 'var(--color-bg-secondary)', 
                            borderRadius: 'var(--radius-lg)', 
                            padding: 'var(--space-5)',
                            border: '1px solid var(--color-border)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                                <Banknote size={20} style={{ color: 'var(--color-warning)' }} />
                                <h4 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Bénéfice Espèces</h4>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Total Espèces</span>
                                    <span style={{ fontWeight: 600 }}>{formatCurrency(beneficeData.total_cash)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-error)' }}>
                                    <span>- Espèces déclaré</span>
                                    <span>{formatCurrency(beneficeData.total_declared)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-error)' }}>
                                    <span>- Reste à payer espèce</span>
                                    <span>{formatCurrency(beneficeData.total_salaires_especes)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)' }}>
                                    <span>+ Ventes Produits Espèces</span>
                                    <span>{formatCurrency(beneficeData.ventes_produits_especes)}</span>
                                </div>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    paddingTop: 'var(--space-3)',
                                    marginTop: 'var(--space-2)',
                                    borderTop: '2px solid var(--color-border)',
                                    fontWeight: 700,
                                    fontSize: 'var(--font-size-lg)'
                                }}>
                                    <span>= Espèces Bénéfice</span>
                                    <span style={{ color: beneficeData.espece_benefice >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                                        {formatCurrency(beneficeData.espece_benefice)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Total Bénéfice */}
                    <div style={{ 
                        marginTop: 'var(--space-5)',
                        padding: 'var(--space-4)',
                        background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-accent-500))',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ color: 'white', fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                            BÉNÉFICE TOTAL
                        </span>
                        <span style={{ 
                            color: 'white', 
                            fontWeight: 700, 
                            fontSize: 'var(--font-size-2xl)'
                        }}>
                            {formatCurrency(beneficeData.cb_benefice + beneficeData.espece_benefice)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Synthesis;
