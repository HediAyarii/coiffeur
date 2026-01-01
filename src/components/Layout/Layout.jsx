import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles = {
    '/': 'Tableau de bord',
    '/salons': 'Gestion des Salons',
    '/hairdressers': 'Gestion des Coiffeurs',
    '/presence': 'Fiche de Présence',
    '/services': 'Catalogue Services',
    '/products': 'Produits & Stock',
    '/transactions': 'Historique des Services',
    '/expenses': 'Gestion des Dépenses',
    '/payroll': 'Paie & Finances',
    '/reports': 'Rapports & Analyses',
    '/settings': 'Paramètres',
    '/mon-espace': 'Mon Espace'
};

const Layout = ({ children }) => {
    const { user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved === 'true';
    });
    const location = useLocation();

    const title = pageTitles[location.pathname] || 'Coiffeur Pro';
    const isCoiffeur = user?.role === 'coiffeur';

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
    }, [sidebarCollapsed]);

    // For coiffeur role, render minimal layout (mobile-first)
    if (isCoiffeur) {
        return (
            <div className="app-layout coiffeur-layout">
                <main className="main-content coiffeur-main">
                    {children}
                </main>
            </div>
        );
    }

    return (
        <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            <main className="main-content">
                <Header
                    title={title}
                    onMenuClick={() => setSidebarOpen(true)}
                />

                <div className="page-container">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
