import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for saved session
        const savedUser = localStorage.getItem('coiffeur_auth');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                localStorage.removeItem('coiffeur_auth');
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const result = await authAPI.login(username, password);
            
            if (result.success) {
                setUser(result.user);
                localStorage.setItem('coiffeur_auth', JSON.stringify(result.user));
                return { success: true, user: result.user };
            }
            
            return { success: false, error: result.error || 'Identifiants incorrects' };
        } catch (error) {
            return { success: false, error: error.message || 'Erreur de connexion' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('coiffeur_auth');
    };

    const isAdmin = () => user?.role === 'admin';
    const isCoiffeur = () => user?.role === 'coiffeur';

    return (
        <AuthContext.Provider value={{ 
            user, 
            login, 
            logout, 
            loading, 
            isAdmin, 
            isCoiffeur,
            isAuthenticated: !!user 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
