#!/bin/bash

# ===========================================
# Script de déploiement Coiffeur Pro
# Pour VPS Ubuntu avec PostgreSQL self-hosted
# ===========================================

set -e

echo "🚀 Déploiement Coiffeur Pro"
echo "=========================="

# Variables
APP_DIR=~/coiffeur/coiffeur
DB_NAME="coiffeur_db"
DB_USER="coiffeur_user"
DB_PASS="CoiffeurPro2026!"  # CHANGE THIS!

# 1. Créer la base de données PostgreSQL
echo ""
echo "📦 Configuration PostgreSQL..."

sudo -u postgres psql <<EOF
-- Supprimer si existe (optionnel, décommenter si besoin)
-- DROP DATABASE IF EXISTS $DB_NAME;
-- DROP USER IF EXISTS $DB_USER;

-- Créer l'utilisateur s'il n'existe pas
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
    END IF;
END
\$\$;

-- Créer la base si elle n'existe pas
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Connexion et extensions
\c $DB_NAME
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Droits
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF

echo "✅ Base de données configurée"

# 2. Créer le fichier .env pour le serveur
echo ""
echo "📝 Création du fichier .env..."

cat > $APP_DIR/server/.env <<EOF
# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS

# Server Configuration
PORT=3002
NODE_ENV=production

# JWT Secret
JWT_SECRET=$(openssl rand -base64 32)
EOF

echo "✅ Fichier .env créé"

# 3. Installer les dépendances
echo ""
echo "📦 Installation des dépendances..."

cd $APP_DIR
npm install

cd $APP_DIR/server
npm install

echo "✅ Dépendances installées"

# 4. Build du frontend
echo ""
echo "🔨 Build du frontend..."

cd $APP_DIR
npm run build

echo "✅ Frontend buildé"

# 5. Initialiser la base de données
echo ""
echo "🗄️ Initialisation de la base de données..."

cd $APP_DIR/server
node database/init.js

echo "✅ Base de données initialisée"

# 6. Configuration PM2
echo ""
echo "⚙️ Configuration PM2..."

# Arrêter l'ancienne instance si elle existe
pm2 delete coiffeur-api 2>/dev/null || true

# Créer le fichier ecosystem PM2
cat > $APP_DIR/ecosystem.config.cjs <<EOF
module.exports = {
  apps: [{
    name: 'coiffeur-api',
    script: 'server/index.js',
    cwd: '$APP_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    }
  }]
};
EOF

# Démarrer avec PM2
cd $APP_DIR
pm2 start ecosystem.config.cjs
pm2 save

echo "✅ PM2 configuré"

# 7. Configuration Nginx (optionnel)
echo ""
echo "📋 Configuration Nginx suggérée:"
echo "================================"
cat <<'NGINX'
# /etc/nginx/sites-available/coiffeur

server {
    listen 80;
    server_name votre-domaine.com;  # Remplacer par votre domaine

    # Frontend (fichiers statiques)
    location / {
        root /home/ubuntu/coiffeur/coiffeur/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

echo ""
echo "🎉 Déploiement terminé!"
echo ""
echo "📌 Prochaines étapes:"
echo "   1. Configurer Nginx avec le fichier ci-dessus"
echo "   2. sudo ln -s /etc/nginx/sites-available/coiffeur /etc/nginx/sites-enabled/"
echo "   3. sudo nginx -t && sudo systemctl reload nginx"
echo "   4. (Optionnel) Configurer SSL avec: sudo certbot --nginx -d votre-domaine.com"
echo ""
echo "🔗 URLs:"
echo "   - Frontend: http://votre-ip/"
echo "   - API: http://votre-ip:3002/api"
echo ""
echo "📊 Commandes utiles:"
echo "   - pm2 logs coiffeur-api    # Voir les logs"
echo "   - pm2 restart coiffeur-api # Redémarrer"
echo "   - pm2 monit                 # Monitoring"
