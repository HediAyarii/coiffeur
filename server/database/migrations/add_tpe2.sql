-- Migration: Add declared_tpe2 table for TPE2 declarations
-- Date: 2026-05-11

CREATE TABLE IF NOT EXISTS declared_tpe2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    tpe2_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    frais_amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- 2% of tpe2_amount
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(salon_id, month)
);

CREATE INDEX IF NOT EXISTS idx_declared_tpe2_salon ON declared_tpe2(salon_id);
CREATE INDEX IF NOT EXISTS idx_declared_tpe2_month ON declared_tpe2(month);

COMMENT ON TABLE declared_tpe2 IS 'Montants TPE2 déclarés par salon et par mois';
COMMENT ON COLUMN declared_tpe2.tpe2_amount IS 'Montant TPE2 (déduit du CA CB)';
COMMENT ON COLUMN declared_tpe2.frais_amount IS 'Frais TPE2 (2% du montant TPE2, déduit du CA CB)';
