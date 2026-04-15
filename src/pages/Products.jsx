import React, { useState, useEffect } from 'react';
import { 
    Plus, Edit2, Trash2, Package, AlertTriangle, FolderOpen, AlertCircle,
    Store, ArrowUpCircle, ArrowDownCircle, History, TrendingUp, TrendingDown,
    Hash, Euro, Boxes, RefreshCw, Settings, Pencil, ShoppingCart, CreditCard, Banknote,
    Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Modal, DataTable } from '../components/UI';
import { productsAPI, productCategoriesAPI, salonsAPI } from '../services/api';
import { useDateFilter } from '../context/DateFilterContext';

const Products = () => {
    const { startDate, endDate, getMonth } = useDateFilter();
    const selectedMonth = getMonth(); // YYYY-MM from startDate
    
    // Data states
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [salons, setSalons] = useState([]);
    const [movements, setMovements] = useState([]);
    const [summary, setSummary] = useState(null);
    
    // UI states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('products'); // products, stock, movements
    const [selectedSalon, setSelectedSalon] = useState('');
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [editing, setEditing] = useState(null);
    
    // Form states
    const [categoryName, setCategoryName] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        reference: '',
        category_id: '',
        purchase_price: '',
        sale_price: ''
    });
    const [stockForm, setStockForm] = useState({
        product_id: '',
        salon_id: '',
        quantity: 0,
        alert_threshold: 5,
        product_name: ''
    });
    const [movementForm, setMovementForm] = useState({
        product_id: '',
        salon_id: '',
        movement_type: 'entry',
        quantity: 1,
        reason: ''
    });

    // Sales states
    const [sales, setSales] = useState([]);
    const [salesSummary, setSalesSummary] = useState(null);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [saleForm, setSaleForm] = useState({
        product_id: '',
        salon_id: '',
        quantity: 1,
        unit_price: '',
        sale_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        vat_rate: '20',
        sale_type: 'sale',
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, [selectedSalon]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const [productsData, categoriesData, salonsData, summaryData] = await Promise.all([
                selectedSalon ? productsAPI.getBySalon(selectedSalon) : productsAPI.getAll(),
                productCategoriesAPI.getAll(),
                salonsAPI.getActive(),
                productsAPI.getSummary(selectedSalon)
            ]);
            
            setProducts(productsData);
            setCategories(categoriesData);
            setSalons(salonsData);
            setSummary(summaryData);
            
            // Load movements if on movements tab
            if (activeTab === 'movements') {
                const filters = { limit: 50 };
                if (selectedSalon) filters.salon_id = selectedSalon;
                const movementsData = await productsAPI.getMovements(filters);
                setMovements(movementsData);
            }
        } catch (err) {
            setError('Erreur lors du chargement des données');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadMovements = async () => {
        try {
            const filters = { limit: 50 };
            if (selectedSalon) filters.salon_id = selectedSalon;
            const movementsData = await productsAPI.getMovements(filters);
            setMovements(movementsData);
        } catch (err) {
            console.error('Error loading movements:', err);
        }
    };

    useEffect(() => {
        if (activeTab === 'movements') {
            loadMovements();
        }
    }, [activeTab, selectedSalon]);

    // Load sales data
    const loadSales = async () => {
        try {
            const filters = { month: selectedMonth, limit: 100 };
            if (selectedSalon) filters.salon_id = selectedSalon;
            const [salesData, summaryData] = await Promise.all([
                productsAPI.getSales(filters),
                productsAPI.getSalesSummary(selectedMonth)
            ]);
            setSales(salesData);
            setSalesSummary(summaryData);
        } catch (err) {
            console.error('Error loading sales:', err);
        }
    };

    useEffect(() => {
        if (activeTab === 'sales') {
            loadSales();
        }
    }, [activeTab, selectedSalon, selectedMonth]);

    // Product CRUD
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        try {
            if (editing) {
                await productsAPI.update(editing.id, formData);
            } else {
                await productsAPI.create(formData);
            }
            setShowModal(false);
            resetForm();
            await loadData();
        } catch (err) {
            setError('Erreur lors de la sauvegarde');
            console.error(err);
        }
    };

    const handleEdit = (item) => {
        setEditing(item);
        setFormData({
            name: item.name,
            reference: item.reference || '',
            category_id: item.category_id || '',
            purchase_price: item.purchase_price,
            sale_price: item.sale_price
        });
        setShowModal(true);
    };

    const handleDelete = async (item) => {
        if (confirm(`Supprimer le produit "${item.name}" ?`)) {
            try {
                await productsAPI.delete(item.id);
                await loadData();
            } catch (err) {
                setError('Erreur lors de la suppression');
                console.error(err);
            }
        }
    };

    const resetForm = () => {
        setEditing(null);
        setFormData({
            name: '',
            reference: '',
            category_id: '',
            purchase_price: '',
            sale_price: ''
        });
    };

    // Category CRUD
    const handleCreateCategory = async () => {
        if (categoryName.trim()) {
            try {
                await productCategoriesAPI.create({ name: categoryName.trim() });
                setCategoryName('');
                setShowCategoryModal(false);
                await loadData();
            } catch (err) {
                setError('Erreur lors de la création de la catégorie');
                console.error(err);
            }
        }
    };

    // Stock management
    const handleSetStock = async () => {
        try {
            await productsAPI.setStock(stockForm);
            setShowStockModal(false);
            setStockForm({ product_id: '', salon_id: '', quantity: 0, alert_threshold: 5, product_name: '' });
            await loadData();
        } catch (err) {
            setError('Erreur lors de la mise à jour du stock');
            console.error(err);
        }
    };

    const openStockModal = (product) => {
        setStockForm({
            product_id: product.id,
            salon_id: selectedSalon || '',
            quantity: product.stock_quantity || 0,
            alert_threshold: product.alert_threshold || 5,
            product_name: product.name
        });
        setShowStockModal(true);
    };

    // Movement management
    const handleRecordMovement = async () => {
        try {
            await productsAPI.recordMovement(movementForm);
            setShowMovementModal(false);
            setMovementForm({ product_id: '', salon_id: '', movement_type: 'entry', quantity: 1, reason: '' });
            await loadData();
            if (activeTab === 'movements') {
                await loadMovements();
            }
        } catch (err) {
            setError(err.message || 'Erreur lors de l\'enregistrement du mouvement');
            console.error(err);
        }
    };

    const openMovementModal = (type, product = null) => {
        setMovementForm({
            product_id: product?.id || '',
            salon_id: selectedSalon || '',
            movement_type: type,
            quantity: 1,
            reason: ''
        });
        setShowMovementModal(true);
    };

    // Sales management
    const openSaleModal = (product = null) => {
        const selectedProduct = product || products[0];
        setSaleForm({
            product_id: selectedProduct?.id || '',
            salon_id: selectedSalon || (salons.length > 0 ? salons[0].id : ''),
            quantity: 1,
            unit_price: selectedProduct?.sale_price || '',
            sale_date: new Date().toISOString().split('T')[0],
            payment_method: 'cash',
            vat_rate: '20',
            sale_type: 'sale',
            notes: ''
        });
        setShowSaleModal(true);
    };

    const handleCreateSale = async () => {
        try {
            if (!saleForm.product_id || !saleForm.salon_id || !saleForm.quantity) {
                setError('Veuillez remplir tous les champs obligatoires');
                return;
            }
            if (saleForm.sale_type === 'sale' && !saleForm.unit_price) {
                setError('Le prix unitaire est requis pour une vente');
                return;
            }
            await productsAPI.createSale({
                ...saleForm,
                quantity: parseInt(saleForm.quantity),
                unit_price: saleForm.sale_type === 'internal_use' ? 0 : parseFloat(saleForm.unit_price),
                vat_rate: saleForm.sale_type === 'internal_use' ? 0 : parseFloat(saleForm.vat_rate)
            });
            setShowSaleModal(false);
            setSaleForm({
                product_id: '',
                salon_id: '',
                quantity: 1,
                unit_price: '',
                sale_date: new Date().toISOString().split('T')[0],
                payment_method: 'cash',
                vat_rate: '20',
                sale_type: 'sale',
                notes: ''
            });
            await loadSales();
            await loadData();
        } catch (err) {
            setError(err.message || 'Erreur lors de l\'enregistrement');
            console.error(err);
        }
    };

    const handleDeleteSale = async (sale) => {
        if (confirm(`Supprimer cette vente de ${sale.product_name} ?`)) {
            try {
                await productsAPI.deleteSale(sale.id);
                await loadSales();
            } catch (err) {
                setError('Erreur lors de la suppression');
                console.error(err);
            }
        }
    };

    const formatMonth = (monthStr) => {
        const [year, month] = monthStr.split('-');
        const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                           'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    };

    // Helpers
    const getCategoryName = (id) => {
        const cat = categories.find(c => c.id === id);
        return cat ? cat.name : '—';
    };

    const isLowStock = (product) => {
        const qty = product.stock_quantity ?? product.total_stock ?? 0;
        const threshold = product.alert_threshold ?? 5;
        return qty <= threshold;
    };

    const getMovementTypeLabel = (type) => {
        const labels = {
            'entry': 'Entrée',
            'exit': 'Sortie',
            'sale': 'Vente',
            'adjustment': 'Ajustement',
            'transfer_in': 'Transfert entrant',
            'transfer_out': 'Transfert sortant'
        };
        return labels[type] || type;
    };

    const getMovementTypeColor = (type) => {
        if (['entry', 'transfer_in'].includes(type)) return 'var(--color-success)';
        if (['exit', 'sale', 'transfer_out'].includes(type)) return 'var(--color-error)';
        return 'var(--color-warning)';
    };

    // Stats calculations
    const lowStockCount = products.filter(isLowStock).length;
    const totalStockValue = summary?.stock_value_purchase || 0;
    const totalSaleValue = summary?.stock_value_sale || 0;

    // Columns for products table
    const productColumns = [
        {
            header: 'Produit',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 'var(--radius-lg)',
                        background: isLowStock(row)
                            ? 'var(--color-warning-bg)'
                            : 'rgba(139, 92, 246, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isLowStock(row) ? 'var(--color-warning)' : 'var(--color-primary-400)'
                    }}>
                        {isLowStock(row) ? <AlertTriangle size={20} /> : <Package size={20} />}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600 }}>{row.name}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                            {row.reference && <span style={{ marginRight: 8 }}>#{row.reference}</span>}
                            {getCategoryName(row.category_id)}
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: 'Prix achat',
            render: (row) => (
                <span style={{ color: 'var(--color-text-secondary)' }}>
                    {parseFloat(row.purchase_price).toFixed(2)} €
                </span>
            )
        },
        {
            header: 'Prix vente',
            render: (row) => (
                <span style={{ fontWeight: 600, color: 'var(--color-accent-400)' }}>
                    {parseFloat(row.sale_price).toFixed(2)} €
                </span>
            )
        },
        {
            header: 'Marge',
            render: (row) => {
                const margin = row.sale_price - row.purchase_price;
                const marginPercent = row.purchase_price > 0
                    ? ((margin / row.purchase_price) * 100).toFixed(0)
                    : 0;
                return (
                    <span className="badge badge-success">
                        +{marginPercent}%
                    </span>
                );
            }
        },
        {
            header: 'Stock',
            render: (row) => {
                const qty = row.stock_quantity ?? row.total_stock ?? 0;
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{
                            fontWeight: 600,
                            color: isLowStock(row) ? 'var(--color-warning)' : 'var(--color-text-primary)'
                        }}>
                            {qty}
                        </span>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={(e) => { e.stopPropagation(); openStockModal(row); }}
                            title="Modifier le stock"
                            style={{ padding: '2px 6px', minWidth: 'auto' }}
                        >
                            <Pencil size={14} />
                        </button>
                        {isLowStock(row) && (
                            <span className="badge badge-warning">Stock bas</span>
                        )}
                        {!selectedSalon && row.salon_count > 0 && (
                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                ({row.salon_count} boutique{row.salon_count > 1 ? 's' : ''})
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            header: 'Actions',
            width: '180px',
            render: (row) => (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {selectedSalon && (
                        <>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={(e) => { e.stopPropagation(); openMovementModal('entry', row); }}
                                title="Entrée stock"
                                style={{ color: 'var(--color-success)' }}
                            >
                                <ArrowDownCircle size={16} />
                            </button>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={(e) => { e.stopPropagation(); openMovementModal('exit', row); }}
                                title="Sortie stock"
                                style={{ color: 'var(--color-error)' }}
                            >
                                <ArrowUpCircle size={16} />
                            </button>
                        </>
                    )}
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
                        title="Modifier"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
                        style={{ color: 'var(--color-error)' }}
                        title="Supprimer"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    // Columns for movements table
    const movementColumns = [
        {
            header: 'Date',
            render: (row) => (
                <div>
                    <div style={{ fontWeight: 500 }}>
                        {new Date(row.created_at).toLocaleDateString('fr-FR')}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {new Date(row.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            )
        },
        {
            header: 'Produit',
            render: (row) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{row.product_name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {row.product_reference && `#${row.product_reference}`}
                    </div>
                </div>
            )
        },
        {
            header: 'Boutique',
            render: (row) => row.salon_name
        },
        {
            header: 'Type',
            render: (row) => (
                <span className="badge" style={{ 
                    background: `${getMovementTypeColor(row.movement_type)}20`,
                    color: getMovementTypeColor(row.movement_type)
                }}>
                    {getMovementTypeLabel(row.movement_type)}
                </span>
            )
        },
        {
            header: 'Quantité',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {['entry', 'transfer_in'].includes(row.movement_type) ? (
                        <TrendingUp size={16} style={{ color: 'var(--color-success)' }} />
                    ) : (
                        <TrendingDown size={16} style={{ color: 'var(--color-error)' }} />
                    )}
                    <span style={{ fontWeight: 600 }}>
                        {['entry', 'transfer_in'].includes(row.movement_type) ? '+' : '-'}{row.quantity}
                    </span>
                </div>
            )
        },
        {
            header: 'Stock',
            render: (row) => (
                <span style={{ color: 'var(--color-text-muted)' }}>
                    {row.previous_stock} → {row.new_stock}
                </span>
            )
        },
        {
            header: 'Motif',
            render: (row) => row.reason || '—'
        }
    ];

    // Sales columns
    const salesColumns = [
        {
            header: 'Date',
            render: (row) => (
                <div style={{ fontWeight: 500 }}>
                    {new Date(row.sale_date).toLocaleDateString('fr-FR')}
                </div>
            )
        },
        {
            header: 'Produit',
            render: (row) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{row.product_name}</div>
                    {row.product_reference && (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                            #{row.product_reference}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'Boutique',
            render: (row) => (
                <div>
                    <div>{row.salon_name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {row.salon_city}
                    </div>
                </div>
            )
        },
        {
            header: 'Qté',
            render: (row) => (
                <span style={{ fontWeight: 600 }}>{row.quantity}</span>
            )
        },
        {
            header: 'Prix unit.',
            render: (row) => (
                <span>{parseFloat(row.unit_price).toFixed(2)} €</span>
            )
        },
        {
            header: 'Total',
            render: (row) => (
                <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                    {parseFloat(row.total_price).toFixed(2)} €
                </span>
            )
        },
        {
            header: 'Paiement',
            render: (row) => {
                const paymentColors = {
                    cash: { bg: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-success)' },
                    card: { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-accent-400)' },
                    salon: { bg: 'rgba(234, 179, 8, 0.1)', color: 'var(--color-warning)' }
                };
                const paymentLabels = { cash: 'Espèces', card: 'Carte', salon: 'Salon' };
                const style = paymentColors[row.payment_method] || paymentColors.cash;
                return (
                    <span className="badge" style={{ background: style.bg, color: style.color }}>
                        {paymentLabels[row.payment_method] || row.payment_method}
                    </span>
                );
            }
        },
        {
            header: 'Actions',
            render: (row) => (
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDeleteSale(row)}
                    style={{ color: 'var(--color-error)' }}
                    title="Supprimer"
                >
                    <Trash2 size={16} />
                </button>
            )
        }
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: 'var(--space-8)' }}>
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
                    <button 
                        onClick={() => setError(null)} 
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Produits & Stock</h1>
                    <p className="page-subtitle">Gérez votre inventaire par boutique</p>
                </div>
                <div className="page-actions">
                    <select
                        className="form-select"
                        value={selectedSalon}
                        onChange={(e) => setSelectedSalon(e.target.value)}
                        style={{ minWidth: 200 }}
                    >
                        <option value="">Toutes les boutiques</option>
                        {salons.map(salon => (
                            <option key={salon.id} value={salon.id}>
                                {salon.name} - {salon.city}
                            </option>
                        ))}
                    </select>
                    <button className="btn btn-secondary" onClick={() => setShowCategoryModal(true)}>
                        <FolderOpen size={18} />
                        Catégorie
                    </button>
                    {selectedSalon && (
                        <button className="btn btn-secondary" onClick={() => openMovementModal('entry')}>
                            <ArrowDownCircle size={18} />
                            Entrée
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                        <Plus size={18} />
                        Nouveau Produit
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--color-primary-400)' }}>
                        <Package size={24} />
                    </div>
                    <div>
                        <div className="stat-card-value">{products.length}</div>
                        <div className="stat-card-label">Produits</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-success)' }}>
                        <Boxes size={24} />
                    </div>
                    <div>
                        <div className="stat-card-value">{summary?.total_stock || 0}</div>
                        <div className="stat-card-label">Unités en stock</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon" style={{ 
                        background: lowStockCount > 0 ? 'var(--color-warning-bg)' : 'rgba(34, 197, 94, 0.15)', 
                        color: lowStockCount > 0 ? 'var(--color-warning)' : 'var(--color-success)' 
                    }}>
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <div className="stat-card-value" style={{ color: lowStockCount > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                            {lowStockCount}
                        </div>
                        <div className="stat-card-label">Alertes stock</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--color-accent-400)' }}>
                        <Euro size={24} />
                    </div>
                    <div>
                        <div className="stat-card-value" style={{ color: 'var(--color-accent-400)' }}>
                            {parseFloat(totalStockValue).toFixed(0)} €
                        </div>
                        <div className="stat-card-label">Valeur stock (achat)</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ 
                display: 'flex', 
                gap: 'var(--space-2)', 
                marginBottom: 'var(--space-4)',
                borderBottom: '1px solid var(--color-border)'
            }}>
                <button
                    className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('products')}
                    style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }}
                >
                    <Package size={18} />
                    Produits
                </button>
                <button
                    className={`btn ${activeTab === 'sales' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('sales')}
                    style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }}
                >
                    <ShoppingCart size={18} />
                    Ventes
                </button>
                <button
                    className={`btn ${activeTab === 'movements' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('movements')}
                    style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }}
                >
                    <History size={18} />
                    Historique mouvements
                </button>
            </div>

            {/* Content */}
            <div className="card">
                {activeTab === 'products' && (
                    <DataTable
                        columns={productColumns}
                        data={products}
                        emptyMessage="Aucun produit enregistré"
                    />
                )}
                {activeTab === 'sales' && (
                    <>
                        {/* Sales Header */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: 'var(--space-4)',
                            paddingBottom: 'var(--space-4)',
                            borderBottom: '1px solid var(--color-border)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <button className="btn btn-ghost btn-icon" onClick={() => changeMonth(-1)}>
                                    <ChevronLeft size={20} />
                                </button>
                                <span style={{ fontWeight: 600, minWidth: '150px', textAlign: 'center' }}>
                                    {formatMonth(selectedMonth)}
                                </span>
                                <button className="btn btn-ghost btn-icon" onClick={() => changeMonth(1)}>
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                            <button className="btn btn-primary" onClick={() => openSaleModal()}>
                                <Plus size={18} />
                                Nouvelle vente
                            </button>
                        </div>

                        {/* Sales Summary by Salon */}
                        {salesSummary && (
                            <div style={{ marginBottom: 'var(--space-6)' }}>
                                <h3 style={{ 
                                    fontSize: 'var(--font-size-lg)', 
                                    fontWeight: 600, 
                                    marginBottom: 'var(--space-4)' 
                                }}>
                                    Totaux par salon
                                </h3>
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                                    gap: 'var(--space-4)' 
                                }}>
                                    {salesSummary.salons.map(salon => (
                                        <div 
                                            key={salon.salon_id} 
                                            style={{
                                                padding: 'var(--space-4)',
                                                background: 'var(--color-bg-secondary)',
                                                borderRadius: 'var(--radius-lg)',
                                                border: parseFloat(salon.total_revenue) > 0 
                                                    ? '2px solid var(--color-success)' 
                                                    : '1px solid var(--color-border)'
                                            }}
                                        >
                                            <div style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'flex-start',
                                                marginBottom: 'var(--space-3)' 
                                            }}>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{salon.salon_name}</div>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                                        {salon.salon_city}
                                                    </div>
                                                </div>
                                                <div style={{ 
                                                    fontSize: 'var(--font-size-2xl)', 
                                                    fontWeight: 700, 
                                                    color: 'var(--color-success)' 
                                                }}>
                                                    {parseFloat(salon.total_revenue).toFixed(0)} €
                                                </div>
                                            </div>
                                            <div style={{ 
                                                display: 'flex', 
                                                gap: 'var(--space-4)', 
                                                fontSize: 'var(--font-size-sm)',
                                                color: 'var(--color-text-muted)' 
                                            }}>
                                                <span>{salon.sale_count} ventes</span>
                                                <span>{salon.total_quantity} articles</span>
                                            </div>
                                            <div style={{ 
                                                display: 'flex', 
                                                gap: 'var(--space-3)', 
                                                marginTop: 'var(--space-3)',
                                                fontSize: 'var(--font-size-xs)'
                                            }}>
                                                <span style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: 4,
                                                    color: 'var(--color-success)' 
                                                }}>
                                                    <Banknote size={14} />
                                                    {parseFloat(salon.cash_total).toFixed(0)} €
                                                </span>
                                                <span style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: 4,
                                                    color: 'var(--color-accent-400)' 
                                                }}>
                                                    <CreditCard size={14} />
                                                    {parseFloat(salon.card_total).toFixed(0)} €
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Grand Total */}
                                <div style={{
                                    marginTop: 'var(--space-4)',
                                    padding: 'var(--space-4)',
                                    background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))',
                                    borderRadius: 'var(--radius-lg)',
                                    color: 'white',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                                            Total tous salons
                                        </div>
                                        <div style={{ opacity: 0.8, fontSize: 'var(--font-size-sm)' }}>
                                            {salesSummary.totals.total_sales} ventes • {salesSummary.totals.total_quantity} articles
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>
                                            {salesSummary.totals.total_revenue.toFixed(0)} €
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8 }}>
                                            <Banknote size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                            {salesSummary.totals.cash_total.toFixed(0)} € 
                                            <span style={{ margin: '0 8px' }}>|</span>
                                            <CreditCard size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                            {salesSummary.totals.card_total.toFixed(0)} €
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Sales Table */}
                        <h3 style={{ 
                            fontSize: 'var(--font-size-lg)', 
                            fontWeight: 600, 
                            marginBottom: 'var(--space-4)' 
                        }}>
                            Détail des ventes
                        </h3>
                        <DataTable
                            columns={salesColumns}
                            data={sales}
                            emptyMessage="Aucune vente ce mois"
                        />
                    </>
                )}
                {activeTab === 'movements' && (
                    <DataTable
                        columns={movementColumns}
                        data={movements}
                        emptyMessage="Aucun mouvement de stock"
                    />
                )}
            </div>

            {/* Product Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editing ? 'Modifier le Produit' : 'Nouveau Produit'}
                size="lg"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                            Annuler
                        </button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {editing ? 'Enregistrer' : 'Créer'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Nom du produit *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: Shampooing Hydratant"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Référence</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.reference}
                                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                placeholder="Ex: SHP-001"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Catégorie</label>
                        <select
                            className="form-select"
                            value={formData.category_id}
                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                        >
                            <option value="">Sans catégorie</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Prix d'achat (€) *</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.purchase_price}
                                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Prix de vente (€) *</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.sale_price}
                                onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>

                    {formData.purchase_price && formData.sale_price && (
                        <div style={{ 
                            padding: 'var(--space-3)', 
                            background: 'var(--color-success-bg)', 
                            borderRadius: 'var(--radius-md)',
                            marginTop: 'var(--space-2)'
                        }}>
                            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                                Marge: {(formData.sale_price - formData.purchase_price).toFixed(2)} € 
                                ({formData.purchase_price > 0 
                                    ? ((formData.sale_price - formData.purchase_price) / formData.purchase_price * 100).toFixed(0) 
                                    : 0}%)
                            </span>
                        </div>
                    )}
                </form>
            </Modal>

            {/* Category Modal */}
            <Modal
                isOpen={showCategoryModal}
                onClose={() => setShowCategoryModal(false)}
                title="Gérer les Catégories"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>
                            Fermer
                        </button>
                        <button className="btn btn-primary" onClick={handleCreateCategory} disabled={!categoryName.trim()}>
                            Ajouter
                        </button>
                    </>
                }
            >
                <div className="form-group">
                    <label className="form-label">Nouvelle catégorie</label>
                    <input
                        type="text"
                        className="form-input"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="Ex: Shampooings, Soins, Styling..."
                    />
                </div>

                {categories.length > 0 && (
                    <div style={{ marginTop: 'var(--space-4)' }}>
                        <label className="form-label">Catégories existantes</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                            {categories.map(cat => (
                                <span key={cat.id} className="badge badge-purple">{cat.name}</span>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Stock Edit Modal */}
            <Modal
                isOpen={showStockModal}
                onClose={() => setShowStockModal(false)}
                title="Modifier le Stock"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowStockModal(false)}>
                            Annuler
                        </button>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleSetStock}
                            disabled={!stockForm.product_id || !stockForm.salon_id}
                        >
                            Enregistrer
                        </button>
                    </>
                }
            >
                {stockForm.product_name && (
                    <div style={{ 
                        padding: 'var(--space-3)', 
                        background: 'rgba(139, 92, 246, 0.1)', 
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)'
                    }}>
                        <Package size={20} style={{ color: 'var(--color-primary-400)' }} />
                        <span style={{ fontWeight: 600 }}>{stockForm.product_name}</span>
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Boutique *</label>
                    <select
                        className="form-select"
                        value={stockForm.salon_id}
                        onChange={(e) => setStockForm({ ...stockForm, salon_id: e.target.value })}
                        required
                    >
                        <option value="">Sélectionner une boutique</option>
                        {salons.map(s => (
                            <option key={s.id} value={s.id}>{s.name} - {s.city}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <div className="form-group">
                        <label className="form-label">Quantité en stock *</label>
                        <input
                            type="number"
                            className="form-input"
                            value={stockForm.quantity}
                            onChange={(e) => setStockForm({ ...stockForm, quantity: parseInt(e.target.value) || 0 })}
                            min="0"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Seuil d'alerte</label>
                        <input
                            type="number"
                            className="form-input"
                            value={stockForm.alert_threshold}
                            onChange={(e) => setStockForm({ ...stockForm, alert_threshold: parseInt(e.target.value) || 5 })}
                            min="0"
                        />
                        <span className="form-hint">Alerte si stock ≤ ce seuil</span>
                    </div>
                </div>

                {stockForm.quantity <= stockForm.alert_threshold && (
                    <div style={{ 
                        padding: 'var(--space-3)', 
                        background: 'var(--color-warning-bg)', 
                        borderRadius: 'var(--radius-md)',
                        marginTop: 'var(--space-2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        color: 'var(--color-warning)'
                    }}>
                        <AlertTriangle size={18} />
                        <span>Ce stock est en dessous du seuil d'alerte</span>
                    </div>
                )}
            </Modal>

            {/* Movement Modal */}
            <Modal
                isOpen={showMovementModal}
                onClose={() => setShowMovementModal(false)}
                title={movementForm.movement_type === 'entry' ? 'Entrée de stock' : 'Sortie de stock'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowMovementModal(false)}>
                            Annuler
                        </button>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleRecordMovement}
                            disabled={!movementForm.product_id || !movementForm.salon_id || movementForm.quantity < 1}
                        >
                            Enregistrer
                        </button>
                    </>
                }
            >
                <div className="form-group">
                    <label className="form-label">Produit *</label>
                    <select
                        className="form-select"
                        value={movementForm.product_id}
                        onChange={(e) => setMovementForm({ ...movementForm, product_id: e.target.value })}
                        required
                    >
                        <option value="">Sélectionner un produit</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} {p.reference && `(#${p.reference})`}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Boutique *</label>
                    <select
                        className="form-select"
                        value={movementForm.salon_id}
                        onChange={(e) => setMovementForm({ ...movementForm, salon_id: e.target.value })}
                        required
                    >
                        <option value="">Sélectionner une boutique</option>
                        {salons.map(s => (
                            <option key={s.id} value={s.id}>{s.name} - {s.city}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Type de mouvement</label>
                    <select
                        className="form-select"
                        value={movementForm.movement_type}
                        onChange={(e) => setMovementForm({ ...movementForm, movement_type: e.target.value })}
                    >
                        <option value="entry">Entrée (réception)</option>
                        <option value="exit">Sortie (utilisation)</option>
                        <option value="sale">Vente</option>
                        <option value="adjustment">Ajustement inventaire</option>
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Quantité *</label>
                    <input
                        type="number"
                        className="form-input"
                        value={movementForm.quantity}
                        onChange={(e) => setMovementForm({ ...movementForm, quantity: parseInt(e.target.value) || 0 })}
                        min="1"
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Motif / Commentaire</label>
                    <input
                        type="text"
                        className="form-input"
                        value={movementForm.reason}
                        onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                        placeholder="Ex: Réception commande fournisseur"
                    />
                </div>
            </Modal>

            {/* Sale Modal */}
            <Modal
                isOpen={showSaleModal}
                onClose={() => setShowSaleModal(false)}
                title={saleForm.sale_type === 'internal_use' ? "Utilisation Interne" : "Nouvelle Vente"}
                size="lg"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowSaleModal(false)}>
                            Annuler
                        </button>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleCreateSale}
                            disabled={!saleForm.product_id || !saleForm.salon_id || !saleForm.quantity || (saleForm.sale_type === 'sale' && !saleForm.unit_price)}
                        >
                            <ShoppingCart size={18} />
                            {saleForm.sale_type === 'internal_use' ? 'Enregistrer l\'utilisation' : 'Enregistrer la vente'}
                        </button>
                    </>
                }
            >
                {/* Sale Type Selector */}
                <div className="form-group">
                    <label className="form-label">Type d'opération</label>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <button
                            type="button"
                            className={`btn ${saleForm.sale_type === 'sale' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setSaleForm({ ...saleForm, sale_type: 'sale' })}
                            style={{ flex: 1 }}
                        >
                            <ShoppingCart size={18} />
                            Vente Client
                        </button>
                        <button
                            type="button"
                            className={`btn ${saleForm.sale_type === 'internal_use' ? 'btn-warning' : 'btn-secondary'}`}
                            onClick={() => setSaleForm({ ...saleForm, sale_type: 'internal_use', unit_price: '', vat_rate: '0' })}
                            style={{ flex: 1, background: saleForm.sale_type === 'internal_use' ? 'var(--color-warning)' : undefined }}
                        >
                            <Package size={18} />
                            Utilisation Salon
                        </button>
                    </div>
                    {saleForm.sale_type === 'internal_use' && (
                        <div style={{ 
                            marginTop: 'var(--space-2)', 
                            padding: 'var(--space-2) var(--space-3)', 
                            background: 'var(--color-warning-bg)', 
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-warning)'
                        }}>
                            Produit utilisé pour les clients du salon (pas de vente, stock déduit)
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label">Produit *</label>
                    <select
                        className="form-select"
                        value={saleForm.product_id}
                        onChange={(e) => {
                            const prod = products.find(p => p.id === e.target.value);
                            setSaleForm({ 
                                ...saleForm, 
                                product_id: e.target.value,
                                unit_price: saleForm.sale_type === 'sale' ? (prod?.sale_price || '') : ''
                            });
                        }}
                        required
                    >
                        <option value="">Sélectionner un produit</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} - {parseFloat(p.sale_price).toFixed(2)} €
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Boutique *</label>
                    <select
                        className="form-select"
                        value={saleForm.salon_id}
                        onChange={(e) => setSaleForm({ ...saleForm, salon_id: e.target.value })}
                        required
                    >
                        <option value="">Sélectionner une boutique</option>
                        {salons.map(s => (
                            <option key={s.id} value={s.id}>{s.name} - {s.city}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input
                        type="date"
                        className="form-input"
                        value={saleForm.sale_date}
                        onChange={(e) => setSaleForm({ ...saleForm, sale_date: e.target.value })}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Quantité *</label>
                    <input
                        type="number"
                        className="form-input"
                        value={saleForm.quantity}
                        onChange={(e) => setSaleForm({ ...saleForm, quantity: parseInt(e.target.value) || 1 })}
                        min="1"
                        required
                    />
                </div>

                {saleForm.sale_type === 'sale' && (
                    <>
                        <div className="form-group">
                            <label className="form-label">Prix unitaire TTC (€) *</label>
                            <input
                                type="number"
                                className="form-input"
                                value={saleForm.unit_price}
                                onChange={(e) => setSaleForm({ ...saleForm, unit_price: e.target.value })}
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Taux de TVA</label>
                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                {['0', '5.5', '10', '20'].map(rate => (
                                    <button
                                        key={rate}
                                        type="button"
                                        className={`btn ${saleForm.vat_rate === rate ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setSaleForm({ ...saleForm, vat_rate: rate })}
                                        style={{ flex: 1 }}
                                    >
                                        {rate}%
                                    </button>
                                ))}
                            </div>
                        </div>

                        {saleForm.quantity && saleForm.unit_price && (
                            (() => {
                                const totalTTC = parseFloat(saleForm.quantity) * parseFloat(saleForm.unit_price);
                                const vatRate = parseFloat(saleForm.vat_rate) || 0;
                                const vatAmount = totalTTC * vatRate / (100 + vatRate);
                                const totalHT = totalTTC - vatAmount;
                                return (
                                    <div style={{
                                        padding: 'var(--space-4)',
                                        background: 'var(--color-bg-secondary)',
                                        borderRadius: 'var(--radius-lg)',
                                        marginBottom: 'var(--space-4)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ color: 'var(--color-text-muted)' }}>Total TTC</span>
                                            <span style={{ fontWeight: 600 }}>{totalTTC.toFixed(2)} €</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ color: 'var(--color-text-muted)' }}>TVA ({vatRate}%)</span>
                                            <span style={{ color: 'var(--color-error)' }}>-{vatAmount.toFixed(2)} €</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>Bénéfice HT</span>
                                            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-xl)', color: 'var(--color-success)' }}>{totalHT.toFixed(2)} €</span>
                                        </div>
                                    </div>
                                );
                            })()
                        )}

                        <div className="form-group">
                            <label className="form-label">Mode de paiement</label>
                            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                <button
                                    type="button"
                                    className={`btn ${saleForm.payment_method === 'cash' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setSaleForm({ ...saleForm, payment_method: 'cash' })}
                                    style={{ flex: 1 }}
                                >
                                    <Banknote size={18} />
                                    Espèces
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${saleForm.payment_method === 'card' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setSaleForm({ ...saleForm, payment_method: 'card' })}
                                    style={{ flex: 1 }}
                                >
                                    <CreditCard size={18} />
                                    Carte
                                </button>
                            </div>
                        </div>
                    </>
                )}

                <div className="form-group">
                    <label className="form-label">Notes</label>
                    <input
                        type="text"
                        className="form-input"
                        value={saleForm.notes}
                        onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                        placeholder={saleForm.sale_type === 'internal_use' ? "Raison de l'utilisation..." : "Notes optionnelles..."}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default Products;
