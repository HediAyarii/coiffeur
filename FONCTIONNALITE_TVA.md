# ✅ Fonctionnalité TVA Récupérable - Implémentée

## 📋 Résumé des modifications

J'ai implémenté la gestion complète de la TVA récupérable pour **TOUTES les charges** des salons : charges variables ET charges fixes.

## 🎯 Nouvelles fonctionnalités

### 1. **Gestion de la TVA par charge (Variables ET Fixes)**
Chaque charge peut maintenant avoir :
- ✅ **Taux de TVA** : Sélection entre 0%, 5.5%, 10%, ou 20%
- ✅ **TVA récupérable** : Case à cocher pour indiquer si la TVA est récupérable
- ✅ **Calcul automatique** : Le montant HT et la TVA sont calculés automatiquement selon le taux choisi

### 2. **Récapitulatif mensuel de TVA récupérable**
- 💰 **Par salon** : Affichage de la TVA récupérable pour chaque salon (charges variables + fixes)
- 📊 **Total global** : Somme de la TVA récupérable pour les 3 salons
- 🗓️ **Filtrage par mois** : Voir la TVA récupérable pour n'importe quel mois

### 3. **Affichage dans les tableaux**
- Colonne "TVA" ajoutée au tableau des dépenses variables
- Indication visuelle (✓/✗) si la TVA est récupérable
- Détails HT + TVA sous le montant TTC

## 📁 Fichiers modifiés

### Backend (Serveur)
1. **`server/database/init.sql`** - Structure de la base de données mise à jour
2. **`server/database/migrations/add_vat_to_expenses.sql`** - Script de migration pour expenses ET fixed_expense_amounts
3. **`server/routes/expenses.js`** - Routes API mises à jour
   - Gestion des champs TVA dans POST et PUT
   - Nouvelle route `/expenses/vat-summary` incluant charges fixes ET variables
4. **`server/routes/fixedExpenses.js`** - Routes API des charges fixes mises à jour
   - Gestion des champs TVA dans la création
   - Gestion des champs TVA dans la mise à jour de montant
   - GET retourne les champs TVA

### Frontend (Client)
1. **`src/pages/Expenses.jsx`** - Page des dépenses mise à jour
   - Formulaire charges variables avec champs TVA
   - Formulaire charges fixes avec champs TVA
   - Formulaire mise à jour montant avec champs TVA
   - Calcul automatique HT/TVA/TTC
   - Affichage du récapitulatif TVA (total variables + fixes)
   - Colonne TVA dans le tableau
2. **`src/services/api.js`** - Méthodes API mises à jour
   - `getVatSummary()` pour le récapitulatif
   - `updateAmount()` avec paramètres TVA

## 🚀 Installation

### Étape 1 : Appliquer la migration de base de données

**Option rapide (recommandée) :**
```powershell
cd server
node migrate-vat.js
```

**Option manuelle :**
Exécuter le fichier SQL dans votre client PostgreSQL :
`server/database/migrations/add_vat_to_expenses.sql`

### Étape 2 : Redémarrer l'application

**Terminal 1 - Backend :**
```powershell
cd server
npm run dev
```

**Terminal 2 - Frontend :**
```powershell
npm run dev
```

## 💡 Comment utiliser

### 1. Ajouter une charge VARIABLE avec TVA :

1. **Cliquer sur "Nouvelle Dépense"**
2. **Remplir le formulaire :**
   - Salon
   - Date
   - Catégorie
   - **Montant TTC** (ex: 1200 €)
   - **Taux de TVA** (ex: 20%)
   - **Cocher "TVA récupérable"** si applicable

3. **Les calculs sont automatiques :**
   - Si TTC = 1200 € et TVA = 20%
   - → HT = 1000 €
   - → TVA = 200 €

4. **Enregistrer**

### 2. Ajouter une charge FIXE avec TVA :

1. **Cliquer sur "Nouvelle Charge Fixe"**
2. **Remplir le formulaire :**
   - Nom de la charge
   - Salon
   - Catégorie
   - **Montant TTC mensuel** (ex: 3600 €)
   - **Taux de TVA** (ex: 20%)
   - **Cocher "TVA récupérable"** si applicable
   - Date d'application

3. **Les calculs sont automatiques :**
   - Si TTC = 3600 € et TVA = 20%
   - → HT = 3000 €
   - → TVA = 600 €

4. **Enregistrer**

### 3. Modifier le montant d'une charge fixe :

1. Cliquer sur le bouton **"Modifier montant"** d'une charge fixe
2. Saisir le nouveau montant TTC
3. Ajuster le taux de TVA si besoin
4. Cocher/Décocher "TVA récupérable"
5. Choisir la date d'application
6. Enregistrer

### 4. Consulter la TVA récupérable :

1. **Aller sur la page "Gestion des Dépenses"**
2. **En haut de page**, vous verrez le récapitulatif TVA :
   - TVA récupérable par salon (charges variables + fixes combinées)
   - Total pour les 3 salons
3. **Filtrer par mois** pour voir l'historique

## 📊 Exemple concret

### Scénario : Salon Paris - Janvier 2026

**Charges VARIABLES ajoutées :**
1. Achat produits : 1200 € TTC (TVA 20% récupérable) → **200 € TVA récupérable**
2. Équipement : 600 € TTC (TVA 20% récupérable) → **100 € TVA récupérable**
3. Marketing : 300 € TTC (TVA 20% non récupérable) → **0 € TVA récupérable**

**Charges FIXES mensuelles :**
1. Loyer : 3600 € TTC (TVA 20% récupérable) → **600 € TVA récupérable**
2. Électricité : 240 € TTC (TVA 20% récupérable) → **40 € TVA récupérable**
3. Assurance : 200 € (TVA 0%) → **0 € TVA récupérable**

**Résultat :**
- **TVA récupérable Salon Paris : 940 €** (300 € variables + 640 € fixes)

Si les 3 salons ont des charges similaires :
- **TVA récupérable TOTALE : 2820 €** (940 € × 3 salons)

## 🎨 Interface utilisateur

### Formulaire de charge fixe :
```
Nom de la charge *       [Loyer salon Paris]
Salon *                  [Paris ▼]
Catégorie *              [Loyer ▼]

Montant TTC mensuel (€)  [3600.00]

Taux de TVA (%)          [20% - Taux normal ▼]

TVA récupérable ?        [✓] Oui, TVA récupérable

┌────────────────────────────────────────────┐
│ Montant HT  │ Montant TVA │ Applicable du  │
│ 3000.00 €   │ 600.00 € ✓  │ 2026-01-01     │
└────────────────────────────────────────────┘
```

### Récapitulatif mensuel :
```
💰 TVA Récupérable - 2026-01

┌─────────────────┬─────────────────┬─────────────────┐
│ Salon Paris     │ Salon Lyon      │ Salon Marseille │
│ 940.00 €        │ 820.00 €        │ 1060.00 €       │
│ TVA récupérable │ TVA récupérable │ TVA récupérable │
│ HT: 4700 €      │ HT: 4100 €      │ HT: 5300 €      │
└─────────────────┴─────────────────┴─────────────────┘

┌──────────────────────────┐
│ TOTAL - 3 Salons         │
│ 2820.00 €                │
│ TVA récupérable totale   │
└──────────────────────────┘
```

## ✨ Avantages

1. **Conformité fiscale** : Suivi précis de la TVA récupérable sur TOUTES les charges
2. **Gain de temps** : Calculs automatiques pour charges variables ET fixes
3. **Visibilité complète** : Récapitulatif global incluant tous les types de charges
4. **Historique** : Consultation de la TVA par mois
5. **Flexibilité** : Tous les taux de TVA français supportés
6. **Charges fixes** : Gestion de l'historique des montants avec TVA

## 📝 Notes importantes

- Les **charges existantes** (variables et fixes) auront automatiquement TVA = 0% et non récupérable
- Vous pouvez **modifier** une charge pour ajouter la TVA
- Le **récapitulatif** combine les charges variables et fixes
- Les **charges fixes** ont un historique de montants, chaque version peut avoir sa propre TVA
- Les **couleurs** indiquent si la TVA est récupérable (vert) ou non (gris)

## 🔧 Support

Si vous rencontrez un problème :
1. Vérifier que la migration est bien appliquée (tables expenses ET fixed_expense_amounts)
2. Redémarrer le serveur backend
3. Vider le cache du navigateur et rafraîchir
4. Consulter les logs du serveur pour les erreurs

---

**Développé le : 4 janvier 2026**
**Status : ✅ Prêt à l'emploi**
**Couverture : Charges variables + Charges fixes**
