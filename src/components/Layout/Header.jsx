import React from 'react';
import { Search, Bell, Menu, User } from 'lucide-react';

const Header = ({ title, onMenuClick }) => {
    return (
        <header className="header">
            <div className="header-left">
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={onMenuClick}
                    style={{ display: 'none' }}
                    id="menu-toggle"
                >
                    <Menu size={20} />
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
