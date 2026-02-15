-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create fixed_expenses table
CREATE TABLE IF NOT EXISTS fixed_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL,
    category VARCHAR(50) DEFAULT 'other',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fixed_expenses_salon_id_fkey FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

-- Create fixed_expense_amounts table
CREATE TABLE IF NOT EXISTS fixed_expense_amounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fixed_expense_id UUID NOT NULL,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    effective_from DATE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    amount_ht NUMERIC(10,2),
    vat_rate NUMERIC(5,2) DEFAULT 0,
    vat_amount NUMERIC(10,2) DEFAULT 0,
    vat_recoverable BOOLEAN DEFAULT false,
    CONSTRAINT fixed_expense_amounts_fixed_expense_id_fkey FOREIGN KEY (fixed_expense_id) REFERENCES fixed_expenses(id) ON DELETE CASCADE,
    CONSTRAINT fixed_expense_amounts_vat_rate_check CHECK (vat_rate = ANY (ARRAY[0::numeric, 5.5, 10::numeric, 20::numeric]))
);

-- Create indexes for fixed_expense_amounts
CREATE INDEX IF NOT EXISTS idx_fixed_expense_amounts_date ON fixed_expense_amounts(effective_from);
CREATE INDEX IF NOT EXISTS idx_fixed_expense_amounts_expense ON fixed_expense_amounts(fixed_expense_id);

-- Create declared_cash table
CREATE TABLE IF NOT EXISTS declared_cash (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL,
    month VARCHAR(7) NOT NULL,
    declared_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    vat_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT declared_cash_salon_id_fkey FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    CONSTRAINT declared_cash_salon_id_month_key UNIQUE (salon_id, month)
);

-- Create indexes for declared_cash
CREATE INDEX IF NOT EXISTS idx_declared_cash_salon ON declared_cash(salon_id);
CREATE INDEX IF NOT EXISTS idx_declared_cash_month ON declared_cash(month);
