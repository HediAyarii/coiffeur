# Migration TVA - Guide d'installation

## 🎯 Objectif
Ajouter la gestion de la TVA récupérable pour les charges des salons.

## ✨ Nouvelles fonctionnalités

### 1. **Gestion de la TVA sur les charges**
- Choisir le taux de TVA (0%, 5.5%, 10%, 20%) pour chaque charge
- Indiquer si la TVA est récupérable ou non
- Calcul automatique : Montant HT, TVA, et TTC

### 2. **Récapitulatif mensuel de TVA récupérable**
- Affichage de la TVA récupérable par salon
- Total global pour les 3 salons
- Filtrage par mois

## 📋 Étapes d'installation

### 1. Appliquer la migration de base de données

**Option A : Via psql (ligne de commande)**
```powershell
# Se connecter à PostgreSQL et exécuter la migration
psql -U votre_utilisateur -d coiffeur_db -f "C:\Users\user\Desktop\Coiffeur\server\database\migrations\add_vat_to_expenses.sql"
```

**Option B : Via pgAdmin ou autre client PostgreSQL**
1. Ouvrir pgAdmin
2. Se connecter à la base de données `coiffeur_db`
3. Ouvrir Query Tool
4. Copier-coller le contenu du fichier `server/database/migrations/add_vat_to_expenses.sql`
5. Exécuter le script

**Option C : Via Node.js (si vous avez accès au serveur)**
```javascript
// Créer un fichier migrate.js dans le dossier server/
import pool from './database/db.js';
import fs from 'fs';

const migration = fs.readFileSync('./database/migrations/add_vat_to_expenses.sql', 'utf-8');

pool.query(migration)
    .then(() => {
        console.log('✅ Migration TVA appliquée avec succès');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Erreur lors de la migration:', err);
        process.exit(1);
    });
```

### 2. Redémarrer le serveur
```powershell
cd server
npm run dev
```

### 3. Redémarrer le client
```powershell
npm run dev
```

## 🔍 Vérification

Après la migration, vérifier que :
1. ✅ Les nouvelles colonnes sont ajoutées : `amount_ht`, `vat_rate`, `vat_amount`, `vat_recoverable`
2. ✅ Les charges existantes ont `vat_rate = 0` et `vat_recoverable = false`
3. ✅ Le formulaire d'ajout de charge affiche les nouveaux champs TVA
4. ✅ Le récapitulatif TVA s'affiche en haut de la page des charges

## 📊 Utilisation

### Ajouter une charge avec TVA :
1. Cliquer sur "Nouvelle Dépense"
2. Remplir le montant TTC
3. Sélectionner le taux de TVA (ex: 20%)
4. Cocher "TVA récupérable" si applicable
5. Les montants HT et TVA sont calculés automatiquement

### Consulter la TVA récupérable :
- Le récapitulatif s'affiche en haut de la page "Gestion des Dépenses"
- Affiche la TVA récupérable par salon pour le mois sélectionné
- Total global pour tous les salons

## 💡 Exemples

### Exemple 1 : Achat de produits (TVA récupérable)
- Montant TTC : 1200 €
- Taux TVA : 20%
- TVA récupérable : ✓ Oui
- → Montant HT : 1000 €
- → TVA : 200 € (récupérable)

### Exemple 2 : Loyer (sans TVA)
- Montant TTC : 2000 €
- Taux TVA : 0%
- TVA récupérable : ✗ Non
- → Montant HT : 2000 €
- → TVA : 0 €

## 🗄️ Structure de la base de données

### Nouvelles colonnes dans la table `expenses` :
- `amount_ht` : Montant hors taxe (DECIMAL)
- `vat_rate` : Taux de TVA - 0, 5.5, 10 ou 20 (DECIMAL)
- `vat_amount` : Montant de la TVA (DECIMAL)
- `vat_recoverable` : TVA récupérable (BOOLEAN)

## 🔄 Rollback (annulation)

Si vous devez annuler la migration :
```sql
ALTER TABLE expenses 
DROP COLUMN IF EXISTS amount_ht,
DROP COLUMN IF EXISTS vat_rate,
DROP COLUMN IF EXISTS vat_amount,
DROP COLUMN IF EXISTS vat_recoverable;
```

## 📞 Support

En cas de problème :
1. Vérifier que la migration SQL s'est exécutée sans erreur
2. Vérifier les logs du serveur backend
3. Vérifier la console du navigateur pour les erreurs frontend
