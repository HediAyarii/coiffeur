-- Migration: Create hairdresser_equipment_purchases table
-- Date: 2026-02-15
-- Description: Track equipment purchases for individual hairdressers (tondeuses, ciseaux, etc.)
--              These amounts are deducted from the hairdresser's salary

CREATE TABLE IF NOT EXISTS hairdresser_equipment_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hairdresser_id UUID NOT NULL REFERENCES hairdressers(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_purchases_hairdresser ON hairdresser_equipment_purchases(hairdresser_id);
CREATE INDEX IF NOT EXISTS idx_equipment_purchases_month_year ON hairdresser_equipment_purchases(year, month);
CREATE INDEX IF NOT EXISTS idx_equipment_purchases_date ON hairdresser_equipment_purchases(purchase_date);
