import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, User, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await login(username, password);
            
            if (result.success) {
                if (result.user.role === 'admin') {
                    navigate('/');
                } else {
                    navigate('/mon-espace');
                }
            } else {
                setError(result.error);
            }
        } catch (error) {
            setError('Erreur de connexion au serveur');
        }
        
        setIsLoading(false);
    };

    return (
        <div className="login-page">
            <div className="login-background">
                <div className="login-pattern"></div>
            </div>
            
            <div className="login-container">
                <div className="login-card">
                    {/* Logo */}
                    <div className="login-logo">
                        <div className="login-logo-icon">
                            <Scissors size={32} />
                        </div>
                        <h1 className="login-logo-text">Coiffeur Pro</h1>
                        <p className="login-subtitle">Gestion Multi-Salons</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="login-form">
                        {error && (
                            <div className="login-error">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Identifiant</label>
                            <div className="input-with-icon">
                                <User className="input-icon" size={18} />
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Email ou nom d'utilisateur"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mot de passe</label>
                            <div className="input-with-icon">
                                <Lock className="input-icon" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="Votre mot de passe"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-primary login-btn"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="login-spinner"></span>
                            ) : (
                                'Se connecter'
                            )}
                        </button>
                    </form>

                    {/* Info */}
                    <div className="login-info">
                        <div className="login-info-section">
                            <h4>👤 Admin</h4>
                            <p>Identifiant: <code>admin</code></p>
                            <p>Mot de passe: <code>admin123</code></p>
                        </div>
                        <div className="login-info-section">
                            <h4>💇 Coiffeur</h4>
                            <p>Identifiant: <code>votre email</code></p>
                            <p>Mot de passe: <code>votre téléphone</code></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
