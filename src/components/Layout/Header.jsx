import React from 'react';
import { Search, Bell, Menu, User, X } from 'lucide-react';

const Header = ({ title, onMenuClick, sidebarOpen }) => {
    return (
        <header className="header">
            <div className="header-left">
                <button
                    className="btn btn-ghost btn-icon mobile-menu-btn"
                    onClick={onMenuClick}
                    aria-label={sidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                >
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                <h1 className="header-title">{title}</h1>

                <div className="header-search">
                    <Search className="header-search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                    />
                </div>
            </div>

            <div className="header-right">
                <button className="header-icon-btn">
                    <Bell size={20} />
                    <span className="notification-dot"></span>
                </button>

                <div className="header-avatar">
                    <User size={18} />
                </div>
            </div>
        </header>
    );
};

export default Header;
