-- Migration: Add VAT rate to product_sales table
-- Date: 2026-02-15

-- Add vat_rate column (0, 5.5, 10, 20)
ALTER TABLE product_sales 
ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(4,2) DEFAULT 20;

-- Add vat_amount column for storing the calculated VAT
ALTER TABLE product_sales 
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(10,2) DEFAULT 0;

-- Update existing records to calculate vat_amount based on default 20%
UPDATE product_sales 
SET vat_amount = ROUND(total_price * vat_rate / (100 + vat_rate), 2)
WHERE vat_amount = 0 OR vat_amount IS NULL;
