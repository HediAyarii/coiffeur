-- Migration: Update payment_method constraint to allow 'salon'
-- Date: 2026-02-16

-- Drop existing constraint
ALTER TABLE product_sales DROP CONSTRAINT IF EXISTS product_sales_payment_method_check;

-- Add new constraint with 'salon' option
ALTER TABLE product_sales ADD CONSTRAINT product_sales_payment_method_check 
CHECK (payment_method IN ('cash', 'card', 'salon'));
