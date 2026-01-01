// ========================================
// COIFFEUR PRO - LOCAL DATABASE LAYER
// Simulates backend with localStorage
// ========================================

const DB_PREFIX = 'coiffeur_';

// Helper functions
const getKey = (table) => `${DB_PREFIX}${table}`;

const loadTable = (table) => {
    try {
        const data = localStorage.getItem(getKey(table));
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error(`Error loading ${table}:`, e);
        return [];
    }
};

const saveTable = (table, data) => {
    try {
        localStorage.setItem(getKey(table), JSON.stringify(data));
        return true;
    } catch (e) {
        console.error(`Error saving ${table}:`, e);
        return false;
    }
};

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ========================================
// GENERIC CRUD OPERATIONS
// ========================================

const createRecord = (table, data) => {
    const records = loadTable(table);
    const newRecord = {
        ...data,
        id: generateId(),
        created_at: new Date().toISOString()
    };
    records.push(newRecord);
    saveTable(table, records);
    return newRecord;
};

const getRecords = (table, filter = null) => {
    const records = loadTable(table);
    if (filter) {
        return records.filter(filter);
    }
    return records;
};

const getRecordById = (table, id) => {
    const records = loadTable(table);
    return records.find(r => r.id === id) || null;
};

const updateRecord = (table, id, updates) => {
    const records = loadTable(table);
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;

    records[index] = {
        ...records[index],
        ...updates,
        updated_at: new Date().toISOString()
    };
    saveTable(table, records);
    return records[index];
};

const deleteRecord = (table, id) => {
    const records = loadTable(table);
    const filtered = records.filter(r => r.id !== id);
    if (filtered.length === records.length) return false;
    saveTable(table, filtered);
    return true;
};

// ========================================
// TABLE-SPECIFIC OPERATIONS
// ========================================

// SALONS
export const salonsDB = {
    getAll: () => getRecords('salons'),
    getById: (id) => getRecordById('salons', id),
    create: (data) => createRecord('salons', {
        name: data.name,
        address: data.address || '',
        city: data.city || '',
        phone: data.phone || '',
        email: data.email || '',
        status: data.status || 'active'
    }),
    update: (id, data) => updateRecord('salons', id, data),
    delete: (id) => deleteRecord('salons', id),
    getActive: () => getRecords('salons', s => s.status === 'active')
};

// HAIRDRESSERS
export const hairdressersDB = {
    getAll: () => getRecords('hairdressers'),
    getById: (id) => getRecordById('hairdressers', id),
    create: (data) => createRecord('hairdressers', {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || '',
        phone: data.phone || '',
        rib_1: data.rib_1 || '',
        rib_2: data.rib_2 || '',
        status: data.status || 'active'
    }),
    update: (id, data) => updateRecord('hairdressers', id, data),
    delete: (id) => deleteRecord('hairdressers', id),
    getActive: () => getRecords('hairdressers', h => h.status === 'active'),
    getFullName: (h) => `${h.first_name} ${h.last_name}`
};

// HAIRDRESSER ASSIGNMENTS
export const assignmentsDB = {
    getAll: () => getRecords('assignments'),
    getById: (id) => getRecordById('assignments', id),
    create: (data) => createRecord('assignments', {
        hairdresser_id: data.hairdresser_id,
        salon_id: data.salon_id,
        start_date: data.start_date,
        end_date: data.end_date || null,
        compensation_type: data.compensation_type || 'commission', // fixed, commission, mixed
        commission_percentage: parseFloat(data.commission_percentage) || 50,
        tax_percentage: parseFloat(data.tax_percentage) || 0,
        fixed_salary: parseFloat(data.fixed_salary) || 0
    }),
    update: (id, data) => updateRecord('assignments', id, data),
    delete: (id) => deleteRecord('assignments', id),
    getByHairdresser: (hairdresserId) => getRecords('assignments', a => a.hairdresser_id === hairdresserId),
    getBySalon: (salonId) => getRecords('assignments', a => a.salon_id === salonId),
    getActive: () => getRecords('assignments', a => !a.end_date || new Date(a.end_date) >= new Date()),
    getActiveForHairdresser: (hairdresserId) => getRecords('assignments',
        a => a.hairdresser_id === hairdresserId && (!a.end_date || new Date(a.end_date) >= new Date())
    )
};

// SERVICES CATALOG
export const servicesDB = {
    getAll: () => getRecords('services'),
    getById: (id) => getRecordById('services', id),
    create: (data) => createRecord('services', {
        name: data.name,
        price: parseFloat(data.price_salon) || parseFloat(data.price) || 0,
        price_salon: parseFloat(data.price_salon) || parseFloat(data.price) || 0,
        price_coiffeur: parseFloat(data.price_coiffeur) || 0,
        duration_minutes: parseInt(data.duration_minutes) || 30,
        active: data.active !== false
    }),
    update: (id, data) => updateRecord('services', id, data),
    delete: (id) => deleteRecord('services', id),
    getActive: () => getRecords('services', s => s.active)
};

// PRODUCT CATEGORIES
export const productCategoriesDB = {
    getAll: () => getRecords('product_categories'),
    getById: (id) => getRecordById('product_categories', id),
    create: (data) => createRecord('product_categories', {
        name: data.name
    }),
    update: (id, data) => updateRecord('product_categories', id, data),
    delete: (id) => deleteRecord('product_categories', id)
};

// PRODUCTS
export const productsDB = {
    getAll: () => getRecords('products'),
    getById: (id) => getRecordById('products', id),
    create: (data) => createRecord('products', {
        name: data.name,
        category_id: data.category_id || null,
        purchase_price: parseFloat(data.purchase_price) || 0,
        sale_price: parseFloat(data.sale_price) || 0,
        stock_quantity: parseInt(data.stock_quantity) || 0,
        alert_threshold: parseInt(data.alert_threshold) || 5,
        salon_id: data.salon_id || null
    }),
    update: (id, data) => updateRecord('products', id, data),
    delete: (id) => deleteRecord('products', id),
    getBySalon: (salonId) => getRecords('products', p => p.salon_id === salonId),
    getLowStock: () => getRecords('products', p => p.stock_quantity <= p.alert_threshold),
    updateStock: (id, quantity) => {
        const product = getRecordById('products', id);
        if (!product) return null;
        return updateRecord('products', id, {
            stock_quantity: product.stock_quantity + quantity
        });
    }
};

// SERVICE HISTORY (TRANSACTIONS)
export const serviceHistoryDB = {
    getAll: () => getRecords('service_history'),
    getById: (id) => getRecordById('service_history', id),
    create: (data) => {
        // Use direct prices: prix salon and prix coiffeur
        const price_salon = parseFloat(data.price_salon) || parseFloat(data.price) || 0;
        const price_coiffeur = parseFloat(data.price_coiffeur) || parseFloat(data.commission_amount) || 0;

        return createRecord('service_history', {
            service_date_time: data.service_date_time || new Date().toISOString(),
            salon_id: data.salon_id,
            hairdresser_id: data.hairdresser_id,
            assignment_id: data.assignment_id || null,
            service_id: data.service_id,
            service_name: data.service_name || '',
            price: price_salon,
            price_salon: price_salon,
            price_coiffeur: price_coiffeur,
            payment_method: data.payment_method || 'cash',
            // Keep for backwards compatibility
            commission_amount: price_coiffeur,
            tax_amount: 0,
            tax_percentage: 0,
            commission_percentage: 0
        });
    },
    update: (id, data) => updateRecord('service_history', id, data),
    delete: (id) => deleteRecord('service_history', id),
    getBySalon: (salonId) => getRecords('service_history', h => h.salon_id === salonId),
    getByHairdresser: (hairdresserId) => getRecords('service_history', h => h.hairdresser_id === hairdresserId),
    getByDateRange: (startDate, endDate) => getRecords('service_history', h => {
        const date = new Date(h.service_date_time);
        return date >= new Date(startDate) && date <= new Date(endDate);
    }),
    getToday: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return getRecords('service_history', h => {
            const date = new Date(h.service_date_time);
            return date >= today && date < tomorrow;
        });
    },
    getThisWeek: () => {
        const today = new Date();
        const firstDay = new Date(today.setDate(today.getDate() - today.getDay() + 1));
        firstDay.setHours(0, 0, 0, 0);
        const lastDay = new Date(firstDay);
        lastDay.setDate(lastDay.getDate() + 7);
        return getRecords('service_history', h => {
            const date = new Date(h.service_date_time);
            return date >= firstDay && date < lastDay;
        });
    },
    getThisMonth: () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        return getRecords('service_history', h => {
            const date = new Date(h.service_date_time);
            return date >= firstDay && date <= lastDay;
        });
    }
};

// EXPENSES
export const expensesDB = {
    getAll: () => getRecords('expenses'),
    getById: (id) => getRecordById('expenses', id),
    create: (data) => createRecord('expenses', {
        salon_id: data.salon_id,
        type: data.type || 'variable', // fixed, variable
        category: data.category || 'other',
        amount: parseFloat(data.amount) || 0,
        date: data.date || new Date().toISOString().split('T')[0],
        description: data.description || ''
    }),
    update: (id, data) => updateRecord('expenses', id, data),
    delete: (id) => deleteRecord('expenses', id),
    getBySalon: (salonId) => getRecords('expenses', e => e.salon_id === salonId),
    getByDateRange: (startDate, endDate) => getRecords('expenses', e => {
        const date = new Date(e.date);
        return date >= new Date(startDate) && date <= new Date(endDate);
    }),
    getThisMonth: () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return getRecords('expenses', e => {
            const date = new Date(e.date);
            return date >= firstDay && date <= lastDay;
        });
    },
    getCategories: () => [
        'rent', 'utilities', 'supplies', 'marketing', 'equipment',
        'maintenance', 'insurance', 'taxes', 'payroll', 'other'
    ]
};

// ========================================
// ANALYTICS & CALCULATIONS
// ========================================

export const analyticsDB = {
    // Revenue calculations
    getTotalRevenue: (transactions) => {
        return transactions.reduce((sum, t) => sum + (t.price || 0), 0);
    },

    getTotalCommissions: (transactions) => {
        return transactions.reduce((sum, t) => sum + (t.commission_amount || 0), 0);
    },

    getTotalTax: (transactions) => {
        return transactions.reduce((sum, t) => sum + (t.tax_amount || 0), 0);
    },

    // Payroll calculation for a hairdresser
    calculatePayroll: (hairdresserId, startDate, endDate) => {
        const transactions = serviceHistoryDB.getByHairdresser(hairdresserId)
            .filter(t => {
                const date = new Date(t.service_date_time);
                return date >= new Date(startDate) && date <= new Date(endDate);
            });

        const assignments = assignmentsDB.getByHairdresser(hairdresserId);

        let totalCommissions = 0;
        let fixedSalary = 0;

        transactions.forEach(t => {
            totalCommissions += t.commission_amount || 0;
        });

        // Add fixed salary if applicable
        assignments.forEach(a => {
            if (a.compensation_type === 'fixed' || a.compensation_type === 'mixed') {
                fixedSalary += a.fixed_salary || 0;
            }
        });

        return {
            totalCommissions,
            fixedSalary,
            totalEarnings: totalCommissions + fixedSalary,
            transactionCount: transactions.length
        };
    },

    // Revenue by salon
    getRevenueBySalon: (transactions) => {
        const salons = salonsDB.getAll();
        return salons.map(salon => {
            const salonTransactions = transactions.filter(t => t.salon_id === salon.id);
            return {
                salon,
                revenue: salonTransactions.reduce((sum, t) => sum + (t.price || 0), 0),
                count: salonTransactions.length
            };
        });
    },

    // Revenue by payment method
    getRevenueByPaymentMethod: (transactions) => {
        const cash = transactions.filter(t => t.payment_method === 'cash');
        const card = transactions.filter(t => t.payment_method === 'card');
        return {
            cash: { count: cash.length, total: cash.reduce((s, t) => s + t.price, 0) },
            card: { count: card.length, total: card.reduce((s, t) => s + t.price, 0) }
        };
    },

    // Top hairdressers by revenue
    getTopHairdressers: (transactions, limit = 5) => {
        const hairdressers = hairdressersDB.getAll();
        const rankings = hairdressers.map(h => {
            const hTransactions = transactions.filter(t => t.hairdresser_id === h.id);
            return {
                hairdresser: h,
                revenue: hTransactions.reduce((sum, t) => sum + (t.price || 0), 0),
                count: hTransactions.length
            };
        });
        return rankings.sort((a, b) => b.revenue - a.revenue).slice(0, limit);
    },

    // Service breakdown
    getServiceBreakdown: (transactions) => {
        const services = servicesDB.getAll();
        return services.map(s => {
            const sTransactions = transactions.filter(t => t.service_id === s.id);
            return {
                service: s,
                count: sTransactions.length,
                revenue: sTransactions.reduce((sum, t) => sum + (t.price || 0), 0)
            };
        }).sort((a, b) => b.count - a.count);
    },

    // Daily revenue for charts
    getDailyRevenue: (transactions, days = 7) => {
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const dayTransactions = transactions.filter(t => {
                const d = new Date(t.service_date_time);
                return d >= date && d < nextDate;
            });

            result.push({
                date: date.toISOString().split('T')[0],
                label: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
                revenue: dayTransactions.reduce((sum, t) => sum + (t.price || 0), 0),
                count: dayTransactions.length
            });
        }
        return result;
    }
};

// ========================================
// SEED DATA (Demo Data)
// ========================================

export const seedDatabase = () => {
    // Check if already seeded
    if (salonsDB.getAll().length > 0) return false;

    // Seed Salons
    const salon1 = salonsDB.create({
        name: 'Élégance Coiffure Paris',
        address: '45 Avenue des Champs-Élysées',
        city: 'Paris',
        phone: '01 42 56 78 90',
        email: 'paris@elegance-coiffure.fr',
        status: 'active'
    });

    const salon2 = salonsDB.create({
        name: 'Élégance Coiffure Lyon',
        address: '12 Rue de la République',
        city: 'Lyon',
        phone: '04 72 34 56 78',
        email: 'lyon@elegance-coiffure.fr',
        status: 'active'
    });

    const salon3 = salonsDB.create({
        name: 'Élégance Coiffure Marseille',
        address: '28 La Canebière',
        city: 'Marseille',
        phone: '04 91 23 45 67',
        email: 'marseille@elegance-coiffure.fr',
        status: 'active'
    });

    // Seed Hairdressers
    const h1 = hairdressersDB.create({
        first_name: 'Marie',
        last_name: 'Dubois',
        email: 'marie.dubois@elegance.fr',
        phone: '06 12 34 56 78',
        status: 'active'
    });

    const h2 = hairdressersDB.create({
        first_name: 'Jean',
        last_name: 'Martin',
        email: 'jean.martin@elegance.fr',
        phone: '06 23 45 67 89',
        status: 'active'
    });

    const h3 = hairdressersDB.create({
        first_name: 'Sophie',
        last_name: 'Bernard',
        email: 'sophie.bernard@elegance.fr',
        phone: '06 34 56 78 90',
        status: 'active'
    });

    const h4 = hairdressersDB.create({
        first_name: 'Pierre',
        last_name: 'Leroy',
        email: 'pierre.leroy@elegance.fr',
        phone: '06 45 67 89 01',
        status: 'active'
    });

    const h5 = hairdressersDB.create({
        first_name: 'Camille',
        last_name: 'Moreau',
        email: 'camille.moreau@elegance.fr',
        phone: '06 56 78 90 12',
        status: 'active'
    });

    // Seed Assignments
    assignmentsDB.create({
        hairdresser_id: h1.id,
        salon_id: salon1.id,
        start_date: '2024-01-01',
        compensation_type: 'commission',
        commission_percentage: 50,
        tax_percentage: 20
    });

    assignmentsDB.create({
        hairdresser_id: h2.id,
        salon_id: salon1.id,
        start_date: '2024-01-01',
        compensation_type: 'mixed',
        commission_percentage: 40,
        tax_percentage: 20,
        fixed_salary: 800
    });

    assignmentsDB.create({
        hairdresser_id: h3.id,
        salon_id: salon2.id,
        start_date: '2024-01-01',
        compensation_type: 'commission',
        commission_percentage: 55,
        tax_percentage: 20
    });

    assignmentsDB.create({
        hairdresser_id: h4.id,
        salon_id: salon2.id,
        start_date: '2024-01-01',
        compensation_type: 'fixed',
        commission_percentage: 0,
        tax_percentage: 20,
        fixed_salary: 2000
    });

    assignmentsDB.create({
        hairdresser_id: h5.id,
        salon_id: salon3.id,
        start_date: '2024-01-01',
        compensation_type: 'commission',
        commission_percentage: 50,
        tax_percentage: 20
    });

    // Seed Services with prix salon and prix coiffeur
    const s1 = servicesDB.create({
        name: 'Coupe Homme',
        price_salon: 25,
        price_coiffeur: 12,
        duration_minutes: 30
    });

    const s2 = servicesDB.create({
        name: 'Coupe Femme',
        price_salon: 45,
        price_coiffeur: 22,
        duration_minutes: 45
    });

    const s3 = servicesDB.create({
        name: 'Coloration',
        price_salon: 65,
        price_coiffeur: 28,
        duration_minutes: 90
    });

    const s4 = servicesDB.create({
        name: 'Mèches',
        price_salon: 85,
        price_coiffeur: 38,
        duration_minutes: 120
    });

    const s5 = servicesDB.create({
        name: 'Brushing',
        price_salon: 30,
        price_coiffeur: 15,
        duration_minutes: 30
    });

    const s6 = servicesDB.create({
        name: 'Barbe',
        price_salon: 15,
        price_coiffeur: 8,
        duration_minutes: 20
    });

    const s7 = servicesDB.create({
        name: 'Soin Capillaire',
        price_salon: 35,
        price_coiffeur: 14,
        duration_minutes: 45
    });

    // Seed Product Categories
    const cat1 = productCategoriesDB.create({ name: 'Shampooings' });
    const cat2 = productCategoriesDB.create({ name: 'Soins' });
    const cat3 = productCategoriesDB.create({ name: 'Styling' });

    // Seed Products
    productsDB.create({
        name: 'Shampooing Hydratant',
        category_id: cat1.id,
        purchase_price: 8,
        sale_price: 18,
        stock_quantity: 25,
        alert_threshold: 5,
        salon_id: salon1.id
    });

    productsDB.create({
        name: 'Masque Réparateur',
        category_id: cat2.id,
        purchase_price: 12,
        sale_price: 28,
        stock_quantity: 15,
        alert_threshold: 3,
        salon_id: salon1.id
    });

    productsDB.create({
        name: 'Gel Coiffant',
        category_id: cat3.id,
        purchase_price: 6,
        sale_price: 15,
        stock_quantity: 30,
        alert_threshold: 8,
        salon_id: salon1.id
    });

    // Seed Service History (Recent transactions)
    const hairdressers = [h1, h2, h3, h4, h5];
    const salons = [salon1, salon1, salon2, salon2, salon3];
    const services = [s1, s2, s3, s4, s5, s6, s7];
    const paymentMethods = ['cash', 'card'];

    // Generate 50 transactions over the past 14 days
    for (let i = 0; i < 50; i++) {
        const daysAgo = Math.floor(Math.random() * 14);
        const hours = 9 + Math.floor(Math.random() * 10);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        date.setHours(hours, Math.floor(Math.random() * 60), 0, 0);

        const hIndex = Math.floor(Math.random() * hairdressers.length);
        const service = services[Math.floor(Math.random() * services.length)];

        serviceHistoryDB.create({
            service_date_time: date.toISOString(),
            salon_id: salons[hIndex].id,
            hairdresser_id: hairdressers[hIndex].id,
            service_id: service.id,
            service_name: service.name,
            price_salon: service.price_salon || service.price,
            price_coiffeur: service.price_coiffeur || 0,
            payment_method: paymentMethods[Math.floor(Math.random() * 2)]
        });
    }

    // Seed Expenses
    const expenseCategories = ['rent', 'utilities', 'supplies', 'marketing', 'equipment'];

    expensesDB.create({
        salon_id: salon1.id,
        type: 'fixed',
        category: 'rent',
        amount: 3500,
        date: new Date().toISOString().split('T')[0],
        description: 'Loyer mensuel'
    });

    expensesDB.create({
        salon_id: salon1.id,
        type: 'fixed',
        category: 'utilities',
        amount: 450,
        date: new Date().toISOString().split('T')[0],
        description: 'Électricité et eau'
    });

    expensesDB.create({
        salon_id: salon2.id,
        type: 'fixed',
        category: 'rent',
        amount: 2800,
        date: new Date().toISOString().split('T')[0],
        description: 'Loyer mensuel'
    });

    expensesDB.create({
        salon_id: salon1.id,
        type: 'variable',
        category: 'supplies',
        amount: 320,
        date: new Date().toISOString().split('T')[0],
        description: 'Produits de coiffure'
    });

    console.log('✅ Database seeded successfully!');
    return true;
};

// Initialize seed data on first load
seedDatabase();

export default {
    salons: salonsDB,
    hairdressers: hairdressersDB,
    assignments: assignmentsDB,
    services: servicesDB,
    productCategories: productCategoriesDB,
    products: productsDB,
    serviceHistory: serviceHistoryDB,
    expenses: expensesDB,
    analytics: analyticsDB,
    seedDatabase
};
