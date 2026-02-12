-- Migration: Add VAT fields to expenses table
-- Date: 2026-01-04

-- Add new columns for VAT management to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS amount_ht DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 0 CHECK (vat_rate IN (0, 5.5, 10, 20)),
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_recoverable BOOLEAN DEFAULT false;

-- Update existing records: set amount_ht = amount and vat_rate = 0 for all existing expenses
UPDATE expenses 
SET amount_ht = amount, 
    vat_rate = 0, 
    vat_amount = 0, 
    vat_recoverable = false
WHERE amount_ht IS NULL;

COMMENT ON COLUMN expenses.amount IS 'Montant TTC (Toutes Taxes Comprises)';
COMMENT ON COLUMN expenses.amount_ht IS 'Montant HT (Hors Taxe)';
COMMENT ON COLUMN expenses.vat_rate IS 'Taux de TVA (0%, 5.5%, 10%, 20%)';
COMMENT ON COLUMN expenses.vat_amount IS 'Montant de la TVA';
COMMENT ON COLUMN expenses.vat_recoverable IS 'TVA récupérable (true/false)';

-- Add new columns for VAT management to fixed_expense_amounts table
ALTER TABLE fixed_expense_amounts
ADD COLUMN IF NOT EXISTS amount_ht DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 0 CHECK (vat_rate IN (0, 5.5, 10, 20)),
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_recoverable BOOLEAN DEFAULT false;

-- Update existing fixed expense amounts: set amount_ht = amount and vat_rate = 0
UPDATE fixed_expense_amounts
SET amount_ht = amount,
    vat_rate = 0,
    vat_amount = 0,
    vat_recoverable = false
WHERE amount_ht IS NULL;

COMMENT ON COLUMN fixed_expense_amounts.amount IS 'Montant TTC (Toutes Taxes Comprises)';
COMMENT ON COLUMN fixed_expense_amounts.amount_ht IS 'Montant HT (Hors Taxe)';
COMMENT ON COLUMN fixed_expense_amounts.vat_rate IS 'Taux de TVA (0%, 5.5%, 10%, 20%)';
COMMENT ON COLUMN fixed_expense_amounts.vat_amount IS 'Montant de la TVA';
COMMENT ON COLUMN fixed_expense_amounts.vat_recoverable IS 'TVA récupérable (true/false)';
