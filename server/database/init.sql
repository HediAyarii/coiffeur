-- ========================================
-- COIFFEUR PRO - PostgreSQL Database Schema
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- USERS TABLE (Admin & Auth)
-- ========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'coiffeur')),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    hairdresser_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- SALONS TABLE
-- ========================================
CREATE TABLE salons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    address VARCHAR(500),
    city VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- HAIRDRESSERS TABLE
-- ========================================
CREATE TABLE hairdressers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matricule VARCHAR(50) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    rib_1 VARCHAR(100),
    rib_2 VARCHAR(100),
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key for users.hairdresser_id
ALTER TABLE users ADD CONSTRAINT fk_users_hairdresser 
    FOREIGN KEY (hairdresser_id) REFERENCES hairdressers(id) ON DELETE SET NULL;

-- ========================================
-- ASSIGNMENTS TABLE (Hairdresser <-> Salon)
-- ========================================
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hairdresser_id UUID NOT NULL REFERENCES hairdressers(id) ON DELETE CASCADE,
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    compensation_type VARCHAR(20) DEFAULT 'commission' CHECK (compensation_type IN ('fixed', 'commission', 'mixed')),
    commission_percentage DECIMAL(5,2) DEFAULT 50,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    fixed_salary DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- SERVICES TABLE
-- ========================================
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    price_salon DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_coiffeur DECIMAL(10,2) DEFAULT 0,
    duration_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- PRODUCT CATEGORIES TABLE
-- ========================================
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- PRODUCTS TABLE
-- ========================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    reference VARCHAR(100),
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    purchase_price DECIMAL(10,2) DEFAULT 0,
    sale_price DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- PRODUCT STOCK BY SALON TABLE
-- ========================================
CREATE TABLE product_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    alert_threshold INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, salon_id)
);

-- ========================================
-- STOCK MOVEMENTS TABLE (Historique des mouvements)
-- ========================================
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('entry', 'exit', 'adjustment', 'sale', 'transfer_in', 'transfer_out')),
    quantity INTEGER NOT NULL,
    previous_stock INTEGER DEFAULT 0,
    new_stock INTEGER DEFAULT 0,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    reason TEXT,
    reference_id UUID,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- SERVICE HISTORY (Transactions)
-- ========================================
CREATE TABLE service_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_date_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    hairdresser_id UUID NOT NULL REFERENCES hairdressers(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    service_name VARCHAR(200),
    price_salon DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_coiffeur DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- EXPENSES TABLE
-- ========================================
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    type VARCHAR(20) DEFAULT 'variable' CHECK (type IN ('fixed', 'variable')),
    category VARCHAR(50) DEFAULT 'other',
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- SALARY COSTS TABLE
-- ========================================
CREATE TABLE salary_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hairdresser_id UUID REFERENCES hairdressers(id) ON DELETE SET NULL,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    net_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    gross_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    charges DECIMAL(10,2) NOT NULL DEFAULT 0,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(last_name, first_name, month, year)
);

-- ========================================
-- PRESENCE TABLE
-- ========================================
CREATE TABLE presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hairdresser_id UUID NOT NULL REFERENCES hairdressers(id) ON DELETE CASCADE,
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hairdresser_id, salon_id, date)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX idx_service_history_date ON service_history(service_date_time);
CREATE INDEX idx_service_history_salon ON service_history(salon_id);
CREATE INDEX idx_service_history_hairdresser ON service_history(hairdresser_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_salon ON expenses(salon_id);
CREATE INDEX idx_presence_date ON presence(date);
CREATE INDEX idx_assignments_hairdresser ON assignments(hairdresser_id);
CREATE INDEX idx_assignments_salon ON assignments(salon_id);
CREATE INDEX idx_product_stock_product ON product_stock(product_id);
CREATE INDEX idx_product_stock_salon ON product_stock(salon_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_salon ON stock_movements(salon_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX idx_salary_costs_month_year ON salary_costs(year, month);
CREATE INDEX idx_salary_costs_hairdresser ON salary_costs(hairdresser_id);

-- ========================================
-- SALARY PAYMENTS TABLE
-- ========================================
CREATE TABLE salary_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salary_cost_id UUID NOT NULL REFERENCES salary_costs(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'virement' CHECK (payment_method IN ('virement', 'cheque', 'especes')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_salary_payments_salary_cost ON salary_payments(salary_cost_id);
CREATE INDEX idx_salary_payments_date ON salary_payments(payment_date);

-- ========================================
-- SEED DATA
-- ========================================

-- Insert Admin User (password: admin123)
INSERT INTO users (username, password_hash, role, name, email) VALUES
('admin', '$2b$10$rQZ5x8qK1234567890abcdefghijklmnopqrstuvwxyz', 'admin', 'Administrateur', 'admin@coiffeurpro.fr');

-- Insert Salons
INSERT INTO salons (id, name, address, city, phone, email, is_active) VALUES
('a1111111-1111-1111-1111-111111111111', 'Élégance Coiffure Paris', '45 Avenue des Champs-Élysées', 'Paris', '01 42 56 78 90', 'paris@elegance-coiffure.fr', true),
('a2222222-2222-2222-2222-222222222222', 'Élégance Coiffure Lyon', '12 Rue de la République', 'Lyon', '04 72 34 56 78', 'lyon@elegance-coiffure.fr', true),
('a3333333-3333-3333-3333-333333333333', 'Élégance Coiffure Marseille', '28 La Canebière', 'Marseille', '04 91 23 45 67', 'marseille@elegance-coiffure.fr', true);

-- Insert Hairdressers
INSERT INTO hairdressers (id, matricule, first_name, last_name, email, phone, tax_percentage, is_active) VALUES
('b1111111-1111-1111-1111-111111111111', 'COIF-001', 'Marie', 'Dubois', 'marie.dubois@elegance.fr', '06 12 34 56 78', 20, true),
('b2222222-2222-2222-2222-222222222222', 'COIF-002', 'Jean', 'Martin', 'jean.martin@elegance.fr', '06 23 45 67 89', 20, true),
('b3333333-3333-3333-3333-333333333333', 'COIF-003', 'Sophie', 'Bernard', 'sophie.bernard@elegance.fr', '06 34 56 78 90', 20, true),
('b4444444-4444-4444-4444-444444444444', 'COIF-004', 'Pierre', 'Leroy', 'pierre.leroy@elegance.fr', '06 45 67 89 01', 20, true),
('b5555555-5555-5555-5555-555555555555', 'COIF-005', 'Camille', 'Moreau', 'camille.moreau@elegance.fr', '06 56 78 90 12', 20, true);

-- Insert User accounts for hairdressers (password = phone number)
INSERT INTO users (username, password_hash, role, name, email, hairdresser_id) VALUES
('marie.dubois@elegance.fr', '06 12 34 56 78', 'coiffeur', 'Marie Dubois', 'marie.dubois@elegance.fr', 'b1111111-1111-1111-1111-111111111111'),
('jean.martin@elegance.fr', '06 23 45 67 89', 'coiffeur', 'Jean Martin', 'jean.martin@elegance.fr', 'b2222222-2222-2222-2222-222222222222'),
('sophie.bernard@elegance.fr', '06 34 56 78 90', 'coiffeur', 'Sophie Bernard', 'sophie.bernard@elegance.fr', 'b3333333-3333-3333-3333-333333333333'),
('pierre.leroy@elegance.fr', '06 45 67 89 01', 'coiffeur', 'Pierre Leroy', 'pierre.leroy@elegance.fr', 'b4444444-4444-4444-4444-444444444444'),
('camille.moreau@elegance.fr', '06 56 78 90 12', 'coiffeur', 'Camille Moreau', 'camille.moreau@elegance.fr', 'b5555555-5555-5555-5555-555555555555');

-- Insert Assignments
INSERT INTO assignments (hairdresser_id, salon_id, start_date, compensation_type, commission_percentage, tax_percentage, fixed_salary) VALUES
('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '2024-01-01', 'commission', 50, 20, 0),
('b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', '2024-01-01', 'mixed', 40, 20, 800),
('b3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', '2024-01-01', 'commission', 55, 20, 0),
('b4444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222', '2024-01-01', 'fixed', 0, 20, 2000),
('b5555555-5555-5555-5555-555555555555', 'a3333333-3333-3333-3333-333333333333', '2024-01-01', 'commission', 50, 20, 0);

-- Insert Services
INSERT INTO services (id, name, price_salon, price_coiffeur, duration_minutes, is_active) VALUES
('c1111111-1111-1111-1111-111111111111', 'Coupe Homme', 25, 12, 30, true),
('c2222222-2222-2222-2222-222222222222', 'Coupe Femme', 45, 22, 45, true),
('c3333333-3333-3333-3333-333333333333', 'Coloration', 65, 28, 90, true),
('c4444444-4444-4444-4444-444444444444', 'Mèches', 85, 38, 120, true),
('c5555555-5555-5555-5555-555555555555', 'Brushing', 30, 15, 30, true),
('c6666666-6666-6666-6666-666666666666', 'Barbe', 15, 8, 20, true),
('c7777777-7777-7777-7777-777777777777', 'Soin Capillaire', 35, 14, 45, true);

-- Insert Product Categories
INSERT INTO product_categories (id, name) VALUES
('d1111111-1111-1111-1111-111111111111', 'Shampooings'),
('d2222222-2222-2222-2222-222222222222', 'Soins'),
('d3333333-3333-3333-3333-333333333333', 'Styling');

-- Insert Products (sans salon_id maintenant, stock séparé par salon)
INSERT INTO products (id, name, reference, category_id, purchase_price, sale_price) VALUES
('e1111111-1111-1111-1111-111111111111', 'Shampooing Hydratant', 'SHP-001', 'd1111111-1111-1111-1111-111111111111', 8, 18),
('e2222222-2222-2222-2222-222222222222', 'Masque Réparateur', 'MSK-001', 'd2222222-2222-2222-2222-222222222222', 12, 28),
('e3333333-3333-3333-3333-333333333333', 'Gel Coiffant', 'GEL-001', 'd3333333-3333-3333-3333-333333333333', 6, 15),
('e4444444-4444-4444-4444-444444444444', 'Shampooing Volume', 'SHP-002', 'd1111111-1111-1111-1111-111111111111', 9, 20),
('e5555555-5555-5555-5555-555555555555', 'Huile Capillaire', 'OIL-001', 'd2222222-2222-2222-2222-222222222222', 15, 35),
('e6666666-6666-6666-6666-666666666666', 'Laque Fixation Forte', 'LAQ-001', 'd3333333-3333-3333-3333-333333333333', 7, 16),
('e7777777-7777-7777-7777-777777777777', 'Coloration Blonde', 'COL-001', 'd2222222-2222-2222-2222-222222222222', 18, 45);

-- Insert Product Stock by Salon
INSERT INTO product_stock (product_id, salon_id, quantity, alert_threshold) VALUES
-- Salon Paris
('e1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 25, 5),
('e2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 15, 3),
('e3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 30, 8),
('e4444444-4444-4444-4444-444444444444', 'a1111111-1111-1111-1111-111111111111', 12, 5),
('e5555555-5555-5555-5555-555555555555', 'a1111111-1111-1111-1111-111111111111', 8, 3),
('e6666666-6666-6666-6666-666666666666', 'a1111111-1111-1111-1111-111111111111', 20, 5),
('e7777777-7777-7777-7777-777777777777', 'a1111111-1111-1111-1111-111111111111', 4, 5),
-- Salon Lyon
('e1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 18, 5),
('e2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 10, 3),
('e3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', 22, 8),
('e4444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222', 20, 5),
('e5555555-5555-5555-5555-555555555555', 'a2222222-2222-2222-2222-222222222222', 10, 3),
-- Salon Marseille
('e1111111-1111-1111-1111-111111111111', 'a3333333-3333-3333-3333-333333333333', 15, 5),
('e2222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333', 6, 3),
('e3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', 18, 8),
('e6666666-6666-6666-6666-666666666666', 'a3333333-3333-3333-3333-333333333333', 3, 5);

-- Insert Sample Service History (last 14 days)
INSERT INTO service_history (service_date_time, salon_id, hairdresser_id, service_id, service_name, price_salon, price_coiffeur, payment_method) VALUES
(NOW() - INTERVAL '1 hour', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'Coupe Femme', 45, 22, 'card'),
(NOW() - INTERVAL '2 hours', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Coupe Homme', 25, 12, 'cash'),
(NOW() - INTERVAL '3 hours', 'a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333', 'Coloration', 65, 28, 'card'),
(NOW() - INTERVAL '1 day', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555', 'Brushing', 30, 15, 'cash'),
(NOW() - INTERVAL '1 day 2 hours', 'a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Coupe Femme', 45, 22, 'card'),
(NOW() - INTERVAL '1 day 4 hours', 'a2222222-2222-2222-2222-222222222222', 'b3333333-3333-3333-3333-333333333333', 'c4444444-4444-4444-4444-444444444444', 'Mèches', 85, 38, 'card'),
(NOW() - INTERVAL '2 days', 'a2222222-2222-2222-2222-222222222222', 'b3333333-3333-3333-3333-333333333333', 'c2222222-2222-2222-2222-222222222222', 'Coupe Femme', 45, 22, 'cash'),
(NOW() - INTERVAL '2 days 1 hour', 'a2222222-2222-2222-2222-222222222222', 'b4444444-4444-4444-4444-444444444444', 'c1111111-1111-1111-1111-111111111111', 'Coupe Homme', 25, 12, 'cash'),
(NOW() - INTERVAL '2 days 3 hours', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'c6666666-6666-6666-6666-666666666666', 'Barbe', 15, 8, 'cash'),
(NOW() - INTERVAL '3 days', 'a3333333-3333-3333-3333-333333333333', 'b5555555-5555-5555-5555-555555555555', 'c3333333-3333-3333-3333-333333333333', 'Coloration', 65, 28, 'card'),
(NOW() - INTERVAL '3 days 2 hours', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'c7777777-7777-7777-7777-777777777777', 'Soin Capillaire', 35, 14, 'cash'),
(NOW() - INTERVAL '4 days', 'a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Coupe Femme', 45, 22, 'card'),
(NOW() - INTERVAL '4 days 1 hour', 'a2222222-2222-2222-2222-222222222222', 'b3333333-3333-3333-3333-333333333333', 'c5555555-5555-5555-5555-555555555555', 'Brushing', 30, 15, 'cash'),
(NOW() - INTERVAL '5 days', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'c4444444-4444-4444-4444-444444444444', 'Mèches', 85, 38, 'card'),
(NOW() - INTERVAL '5 days 3 hours', 'a3333333-3333-3333-3333-333333333333', 'b5555555-5555-5555-5555-555555555555', 'c1111111-1111-1111-1111-111111111111', 'Coupe Homme', 25, 12, 'cash'),
(NOW() - INTERVAL '6 days', 'a2222222-2222-2222-2222-222222222222', 'b4444444-4444-4444-4444-444444444444', 'c3333333-3333-3333-3333-333333333333', 'Coloration', 65, 28, 'card'),
(NOW() - INTERVAL '6 days 2 hours', 'a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'c6666666-6666-6666-6666-666666666666', 'Barbe', 15, 8, 'cash'),
(NOW() - INTERVAL '7 days', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'Coupe Femme', 45, 22, 'card');

-- Insert Sample Expenses
INSERT INTO expenses (salon_id, type, category, amount, date, description) VALUES
('a1111111-1111-1111-1111-111111111111', 'fixed', 'rent', 3500, CURRENT_DATE, 'Loyer mensuel'),
('a1111111-1111-1111-1111-111111111111', 'fixed', 'utilities', 450, CURRENT_DATE, 'Électricité et eau'),
('a2222222-2222-2222-2222-222222222222', 'fixed', 'rent', 2800, CURRENT_DATE, 'Loyer mensuel'),
('a1111111-1111-1111-1111-111111111111', 'variable', 'supplies', 320, CURRENT_DATE, 'Produits de coiffure'),
('a2222222-2222-2222-2222-222222222222', 'variable', 'marketing', 200, CURRENT_DATE - INTERVAL '5 days', 'Publicité Facebook'),
('a3333333-3333-3333-3333-333333333333', 'fixed', 'rent', 2500, CURRENT_DATE, 'Loyer mensuel');

-- Insert Sample Presence (last 7 days)
INSERT INTO presence (hairdresser_id, salon_id, date) VALUES
('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', CURRENT_DATE),
('b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', CURRENT_DATE),
('b3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', CURRENT_DATE),
('b4444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222', CURRENT_DATE),
('b5555555-5555-5555-5555-555555555555', 'a3333333-3333-3333-3333-333333333333', CURRENT_DATE),
('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '1 day'),
('b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '1 day'),
('b3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '1 day');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_salons_updated_at BEFORE UPDATE ON salons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hairdressers_updated_at BEFORE UPDATE ON hairdressers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_stock_updated_at BEFORE UPDATE ON product_stock FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_history_updated_at BEFORE UPDATE ON service_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO coiffeur_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO coiffeur_user;
