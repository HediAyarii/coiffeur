// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

// Generic fetch wrapper
async function fetchAPI(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Erreur serveur' }));
            throw new Error(error.error || error.message || 'Erreur serveur');
        }

        return await response.json();
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    }
}

// ========================================
// AUTH API
// ========================================
export const authAPI = {
    login: (username, password) => 
        fetchAPI('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        }),
    
    getCurrentUser: (userId) =>
        fetchAPI('/auth/me', {
            headers: { 'x-user-id': userId }
        })
};

// ========================================
// SALONS API
// ========================================
export const salonsAPI = {
    getAll: () => fetchAPI('/salons'),
    getActive: () => fetchAPI('/salons/active'),
    getById: (id) => fetchAPI(`/salons/${id}`),
    create: (data) => fetchAPI('/salons', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/salons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/salons/${id}`, {
        method: 'DELETE'
    })
};

// ========================================
// HAIRDRESSERS API
// ========================================
export const hairdressersAPI = {
    getAll: () => fetchAPI('/hairdressers'),
    getActive: () => fetchAPI('/hairdressers/active'),
    getById: (id) => fetchAPI(`/hairdressers/${id}`),
    create: (data) => fetchAPI('/hairdressers', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/hairdressers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/hairdressers/${id}`, {
        method: 'DELETE'
    })
};

// ========================================
// ASSIGNMENTS API
// ========================================
export const assignmentsAPI = {
    getAll: () => fetchAPI('/assignments'),
    getActive: () => fetchAPI('/assignments/active'),
    getByHairdresser: (hairdresserId) => fetchAPI(`/assignments/hairdresser/${hairdresserId}`),
    getBySalon: (salonId) => fetchAPI(`/assignments/salon/${salonId}`),
    getById: (id) => fetchAPI(`/assignments/${id}`),
    create: (data) => fetchAPI('/assignments', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/assignments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/assignments/${id}`, {
        method: 'DELETE'
    })
};

// ========================================
// SERVICES API
// ========================================
export const servicesAPI = {
    getAll: () => fetchAPI('/services'),
    getActive: () => fetchAPI('/services/active'),
    getById: (id) => fetchAPI(`/services/${id}`),
    create: (data) => fetchAPI('/services', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/services/${id}`, {
        method: 'DELETE'
    })
};

// ========================================
// PRODUCT CATEGORIES API
// ========================================
export const productCategoriesAPI = {
    getAll: () => fetchAPI('/product-categories'),
    getById: (id) => fetchAPI(`/product-categories/${id}`),
    create: (data) => fetchAPI('/product-categories', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/product-categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/product-categories/${id}`, {
        method: 'DELETE'
    })
};

// ========================================
// PRODUCTS API
// ========================================
export const productsAPI = {
    getAll: () => fetchAPI('/products'),
    getBySalon: (salonId) => fetchAPI(`/products/salon/${salonId}`),
    getLowStock: () => fetchAPI('/products/low-stock'),
    getLowStockBySalon: (salonId) => fetchAPI(`/products/low-stock/salon/${salonId}`),
    getById: (id) => fetchAPI(`/products/${id}`),
    getProductStock: (productId) => fetchAPI(`/products/${productId}/stock`),
    getSummary: (salonId) => fetchAPI(`/products/summary${salonId ? `?salon_id=${salonId}` : ''}`),
    create: (data) => fetchAPI('/products', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/products/${id}`, {
        method: 'DELETE'
    }),
    // Stock management
    setStock: (data) => fetchAPI('/products/stock', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateStock: (stockId, data) => fetchAPI(`/products/stock/${stockId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    recordMovement: (data) => fetchAPI('/products/movement', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    getMovements: (filters = {}) => {
        // Filter out undefined/null values
        const cleanFilters = Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        );
        const params = new URLSearchParams(cleanFilters).toString();
        return fetchAPI(`/products/movements${params ? `?${params}` : ''}`);
    }
};

// ========================================
// TRANSACTIONS API
// ========================================
export const transactionsAPI = {
    getAll: (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        return fetchAPI(`/transactions${params ? `?${params}` : ''}`);
    },
    getToday: () => fetchAPI('/transactions/today'),
    getThisWeek: () => fetchAPI('/transactions/week'),
    getThisMonth: () => fetchAPI('/transactions/month'),
    getByHairdresser: (hairdresserId, filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        return fetchAPI(`/transactions/hairdresser/${hairdresserId}${params ? `?${params}` : ''}`);
    },
    getById: (id) => fetchAPI(`/transactions/${id}`),
    create: (data) => fetchAPI('/transactions', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/transactions/${id}`, {
        method: 'DELETE'
    })
};

// ========================================
// EXPENSES API
// ========================================
export const expensesAPI = {
    getAll: (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        return fetchAPI(`/expenses${params ? `?${params}` : ''}`);
    },
    getThisMonth: () => fetchAPI('/expenses/month'),
    getBySalon: (salonId) => fetchAPI(`/expenses/salon/${salonId}`),
    getCategories: () => fetchAPI('/expenses/categories'),
    getById: (id) => fetchAPI(`/expenses/${id}`),
    create: (data) => fetchAPI('/expenses', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/expenses/${id}`, {
        method: 'DELETE'
    })
};

// ========================================
// PRESENCE API
// ========================================
export const presenceAPI = {
    getAll: (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        return fetchAPI(`/presence${params ? `?${params}` : ''}`);
    },
    getToday: () => fetchAPI('/presence/today'),
    check: (hairdresser_id, salon_id, date) => 
        fetchAPI(`/presence/check?hairdresser_id=${hairdresser_id}&salon_id=${salon_id}&date=${date}`),
    toggle: (hairdresser_id, salon_id, date) => fetchAPI('/presence/toggle', {
        method: 'POST',
        body: JSON.stringify({ hairdresser_id, salon_id, date })
    }),
    create: (data) => fetchAPI('/presence', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/presence/${id}`, {
        method: 'DELETE'
    })
};

// ========================================
// ANALYTICS API
// ========================================
export const analyticsAPI = {
    getDashboard: () => fetchAPI('/analytics/dashboard'),
    getDashboardStats: () => fetchAPI('/analytics/dashboard'),
    getDailyRevenue: (days = 7) => fetchAPI(`/analytics/daily-revenue?days=${days}`),
    getRevenueBySalon: (period = 'month') => fetchAPI(`/analytics/revenue-by-salon?period=${period}`),
    getTopHairdressers: (limit = 5, period = 'month') => 
        fetchAPI(`/analytics/top-hairdressers?limit=${limit}&period=${period}`),
    getServiceBreakdown: (period = 'month') => fetchAPI(`/analytics/service-breakdown?period=${period}`),
    getPaymentMethods: (period = 'month') => fetchAPI(`/analytics/payment-methods?period=${period}`),
    getPaymentMethodStats: () => fetchAPI('/analytics/payment-methods'),
    getRecentTransactions: (limit = 5) => fetchAPI(`/analytics/recent-transactions?limit=${limit}`),
    getPayroll: (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        return fetchAPI(`/analytics/payroll${params ? `?${params}` : ''}`);
    },
    getHairdresserStats: (hairdresserId) => fetchAPI(`/analytics/hairdresser/${hairdresserId}`)
};

// ========================================
// SALARY COSTS API
// ========================================
export const salaryCostsAPI = {
    getAll: (filters = {}) => {
        const params = new URLSearchParams(
            Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        ).toString();
        return fetchAPI(`/salary-costs${params ? `?${params}` : ''}`);
    },
    getMonths: () => fetchAPI('/salary-costs/months'),
    getSummary: (month, year) => fetchAPI(`/salary-costs/summary?month=${month}&year=${year}`),
    getById: (id) => fetchAPI(`/salary-costs/${id}`),
    import: (data) => fetchAPI('/salary-costs/import', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/salary-costs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/salary-costs/${id}`, {
        method: 'DELETE'
    }),
    deleteMonth: (year, month) => fetchAPI(`/salary-costs/month/${year}/${month}`, {
        method: 'DELETE'
    })
};

// ========================================
// SALARY PAYMENTS API
// ========================================
export const salaryPaymentsAPI = {
    getBySalaryCost: (salaryCostId) => fetchAPI(`/salary-payments/by-salary/${salaryCostId}`),
    getTotal: (salaryCostId) => fetchAPI(`/salary-payments/total/${salaryCostId}`),
    getTotals: (salaryCostIds) => fetchAPI('/salary-payments/totals', {
        method: 'POST',
        body: JSON.stringify({ salaryCostIds })
    }),
    create: (data) => fetchAPI('/salary-payments', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/salary-payments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/salary-payments/${id}`, {
        method: 'DELETE'
    })
};

// ========================================
// FIXED EXPENSES API
// ========================================
export const fixedExpensesAPI = {
    getAll: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.salon_id) queryParams.append('salon_id', params.salon_id);
        if (params?.month) queryParams.append('month', params.month);
        const query = queryParams.toString();
        return fetchAPI(`/fixed-expenses${query ? `?${query}` : ''}`);
    },
    getById: (id) => fetchAPI(`/fixed-expenses/${id}`),
    getHistory: (id) => fetchAPI(`/fixed-expenses/${id}/history`),
    getTotal: (month, salonId) => {
        const params = salonId ? `?salon_id=${salonId}` : '';
        return fetchAPI(`/fixed-expenses/total/${month}${params}`);
    },
    create: (data) => fetchAPI('/fixed-expenses', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/fixed-expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    updateAmount: (id, amount, effectiveFrom) => fetchAPI(`/fixed-expenses/${id}/amount`, {
        method: 'POST',
        body: JSON.stringify({ amount, effective_from: effectiveFrom })
    }),
    delete: (id) => fetchAPI(`/fixed-expenses/${id}`, {
        method: 'DELETE'
    })
};

export default {
    auth: authAPI,
    salons: salonsAPI,
    hairdressers: hairdressersAPI,
    assignments: assignmentsAPI,
    services: servicesAPI,
    productCategories: productCategoriesAPI,
    products: productsAPI,
    transactions: transactionsAPI,
    expenses: expensesAPI,
    fixedExpenses: fixedExpensesAPI,
    presence: presenceAPI,
    analytics: analyticsAPI,
    salaryCosts: salaryCostsAPI,
    salaryPayments: salaryPaymentsAPI
};
