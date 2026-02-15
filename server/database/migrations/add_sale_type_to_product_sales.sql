-- Migration: Add sale_type to product_sales for tracking internal usage
-- Date: 2026-02-16

-- Add sale_type column to distinguish sales from internal usage
ALTER TABLE product_sales 
ADD COLUMN IF NOT EXISTS sale_type VARCHAR(20) DEFAULT 'sale' CHECK (sale_type IN ('sale', 'internal_use'));

-- Create index for sale_type
CREATE INDEX IF NOT EXISTS idx_product_sales_type ON product_sales(sale_type);
