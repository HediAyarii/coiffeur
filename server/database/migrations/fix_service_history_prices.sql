-- Migration: Corriger les prix dans service_history pour correspondre au catalogue
-- Date: 2026-03-25

-- Corriger Coupe Homme : 25.00/12.00 → 15.00/7.50
UPDATE service_history 
SET price_salon = 15.00, price_coiffeur = 7.50 
WHERE service_name = 'Coupe Homme' AND price_salon = 25.00;

-- Corriger Barbe : 15.00/8.00 → 8.00/4.00
UPDATE service_history 
SET price_salon = 8.00, price_coiffeur = 4.00 
WHERE service_name = 'Barbe' AND price_salon = 15.00;

-- Corriger Coloration : coiffeur 28.00 → 32.50
UPDATE service_history 
SET price_coiffeur = 32.50 
WHERE service_name = 'Coloration' AND price_coiffeur = 28.00;

-- Corriger Coupe Femme : coiffeur 22.00 → 22.50
UPDATE service_history 
SET price_coiffeur = 22.50 
WHERE service_name = 'Coupe Femme' AND price_coiffeur = 22.00;

-- Corriger Mèches : coiffeur 38.00 → 42.50 (avec LIKE pour gérer les caractères spéciaux)
UPDATE service_history 
SET price_coiffeur = 42.50 
WHERE service_name LIKE 'M%ches' AND price_coiffeur = 38.00;

-- Corriger Soin Capillaire : coiffeur 14.00 → 17.50
UPDATE service_history 
SET price_coiffeur = 17.50 
WHERE service_name = 'Soin Capillaire' AND price_coiffeur = 14.00;
