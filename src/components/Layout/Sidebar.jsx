import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Building2,
    Users,
    CalendarCheck,
    Scissors,
    Package,
    Receipt,
    Wallet,
    CreditCard,
    BarChart3,
    Settings,
    HelpCircle,
    LogOut,
    User,
    Home,
    FileSpreadsheet,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, isAdmin, isCoiffeur } = useAuth();

    // Admin navigation sections
    const adminNavSections = [
        {
            title: 'Principal',
            items: [
                { path: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
                { path: '/salons', icon: Building2, label: 'Salons' },
                { path: '/hairdressers', icon: Users, label: 'Coiffeurs' },
                { path: '/presence', icon: CalendarCheck, label: 'Fiche de Présence' },
            ]
        },
        {
            title: 'Services',
            items: [
                { path: '/services', icon: Scissors, label: 'Catalogue Services' },
                { path: '/products', icon: Package, label: 'Produits & Stock' },
            ]
        },
        {
            title: 'Finances',
            items: [
                { path: '/expenses', icon: Wallet, label: 'Dépenses' },
                { path: '/salary-costs', icon: FileSpreadsheet, label: 'Coût Salaires' },
                { path: '/payroll', icon: CreditCard, label: 'Paie' },
                { path: '/reports', icon: BarChart3, label: 'Rapports' },
            ]
        }
    ];

    // Coiffeur navigation sections
    const coiffeurNavSections = [
        {
            title: 'Mon Espace',
            items: [
                { path: '/mon-espace', icon: Home, label: 'Tableau de bord' },
            ]
        }
    ];

    const navSections = isAdmin() ? adminNavSections : coiffeurNavSections;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 99,
                        display: 'none'
                    }}
                />
            )}

            <aside className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
                {/* Toggle button */}
                <button 
                    className="sidebar-toggle"
                    onClick={onToggleCollapse}
                    title={collapsed ? 'Ouvrir le menu' : 'Fermer le menu'}
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">C</div>
                        <span className="sidebar-logo-text">Coiffeur Pro</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navSections.map((section, idx) => (
                        <div key={idx} className="nav-section">
                            <div className="nav-section-title">{section.title}</div>
                            {section.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `nav-item ${isActive ? 'active' : ''}`
                                    }
                                    onClick={onClose}
                                >
                                    <item.icon className="nav-item-icon" size={20} />
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer" style={{
                    padding: collapsed ? 'var(--space-2)' : 'var(--space-4)',
                    borderTop: '1px solid var(--color-border)',
                    marginTop: 'auto'
                }}>
                    {/* User Info */}
                    {!collapsed && (
                    <div className="sidebar-user-info" style={{
                        padding: 'var(--space-3)',
                        marginBottom: 'var(--space-3)',
                        background: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)'
                    }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--radius-full)',
                            background: isAdmin() 
                                ? 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700))'
                                : 'linear-gradient(135deg, var(--color-gold-500), var(--color-gold-600))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <User size={18} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                                fontWeight: 600, 
                                fontSize: 'var(--font-size-sm)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {user?.name}
                            </div>
                            <div style={{ 
                                fontSize: 'var(--font-size-xs)', 
                                color: 'var(--color-text-muted)' 
                            }}>
                                {isAdmin() ? 'Administrateur' : 'Coiffeur'}
                            </div>
                        </div>
                    </div>
                    )}

                    <button 
                        onClick={handleLogout}
                        className="nav-item"
                        style={{
                            width: '100%',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-error)',
                            justifyContent: collapsed ? 'center' : 'flex-start'
                        }}
                        title={collapsed ? 'Déconnexion' : ''}
                    >
                        <LogOut className="nav-item-icon" size={20} />
                        {!collapsed && <span>Déconnexion</span>}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
