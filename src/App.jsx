import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Salons from './pages/Salons';
import Hairdressers from './pages/Hairdressers';
import Assignments from './pages/Assignments';
import Presence from './pages/Presence';
import Services from './pages/Services';
import Products from './pages/Products';
import Transactions from './pages/Transactions';
import Expenses from './pages/Expenses';
import SalaryCosts from './pages/SalaryCosts';
import Payroll from './pages/Payroll';
import Reports from './pages/Reports';
import MonEspace from './pages/MonEspace';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading, isAuthenticated } = useAuth();

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Chargement...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard based on role
        if (user.role === 'coiffeur') {
            return <Navigate to="/mon-espace" replace />;
        }
        return <Navigate to="/" replace />;
    }

    return children;
};

// Public Route (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
    const { user, loading, isAuthenticated } = useAuth();

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Chargement...</p>
            </div>
        );
    }

    if (isAuthenticated) {
        if (user.role === 'coiffeur') {
            return <Navigate to="/mon-espace" replace />;
        }
        return <Navigate to="/" replace />;
    }

    return children;
};

function AppRoutes() {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            {/* Public Route */}
            <Route path="/login" element={
                <PublicRoute>
                    <Login />
                </PublicRoute>
            } />

            {/* Admin Routes */}
            <Route path="/" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Layout><Dashboard /></Layout>
                </ProtectedRoute>
            } />
            <Route path="/salons" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Layout><Salons /></Layout>
                </ProtectedRoute>
            } />
            <Route path="/hairdressers" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Layout><Hairdressers /></Layout>
                </ProtectedRoute>
            } />
            <Route path="/assignments" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Layout><Assignments /></Layout>
                </ProtectedRoute>
            } />
            <Route path="/presence" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Layout><Presence /></Layout>
                </ProtectedRoute>
            } />
            <Route path="/services" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Layout><Services /></Layout>
                </ProtectedRoute>
            } />
            <Route path="/products" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Layout><Products /></Layout>
                </ProtectedRoute>
            } />
            <Route path="/transactions" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Layout><Transactions /></Layout>
                </ProtectedRoute>
            } />
            <Route path="/expenses" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Layout><Expenses /></Layout>
                </ProtectedRoute>
            } />
            <Route path="/salary-costs" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Layout><SalaryCosts /></Layout>
                </ProtectedRoute>
            } />
            <Route path="/payroll" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Layout><Payroll /></Layout>
                </ProtectedRoute>
            } />
            <Route path="/reports" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Layout><Reports /></Layout>
                </ProtectedRoute>
            } />

            {/* Coiffeur Routes */}
            <Route path="/mon-espace" element={
                <ProtectedRoute allowedRoles={['coiffeur']}>
                    <Layout><MonEspace /></Layout>
                </ProtectedRoute>
            } />

            {/* Catch all - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
