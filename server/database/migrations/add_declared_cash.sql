-- Migration: Add declared_cash table for cash declaration
-- Date: 2026-01-04

CREATE TABLE IF NOT EXISTS declared_cash (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    declared_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(salon_id, month)
);

CREATE INDEX IF NOT EXISTS idx_declared_cash_salon ON declared_cash(salon_id);
CREATE INDEX IF NOT EXISTS idx_declared_cash_month ON declared_cash(month);

COMMENT ON TABLE declared_cash IS 'Espèces déclarées par salon et par mois';
COMMENT ON COLUMN declared_cash.declared_amount IS 'Montant espèces déclaré (TTC)';
COMMENT ON COLUMN declared_cash.vat_amount IS 'TVA sur espèces déclarées (calculée automatiquement)';
