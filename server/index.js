import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import salonsRoutes from './routes/salons.js';
import hairdressersRoutes from './routes/hairdressers.js';
import assignmentsRoutes from './routes/assignments.js';
import servicesRoutes from './routes/services.js';
import productsRoutes from './routes/products.js';
import productCategoriesRoutes from './routes/productCategories.js';
import transactionsRoutes from './routes/transactions.js';
import expensesRoutes from './routes/expenses.js';
import fixedExpensesRoutes from './routes/fixedExpenses.js';
import presenceRoutes from './routes/presence.js';
import analyticsRoutes from './routes/analytics.js';
import salaryCostsRoutes from './routes/salaryCosts.js';
import salaryPaymentsRoutes from './routes/salaryPayments.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/salons', salonsRoutes);
app.use('/api/hairdressers', hairdressersRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/product-categories', productCategoriesRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/salary-costs', salaryCostsRoutes);
app.use('/api/salary-payments', salaryPaymentsRoutes);
app.use('/api/fixed-expenses', fixedExpensesRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
    console.log(`🚀 Coiffeur API Server running on http://localhost:${PORT}`);
});
