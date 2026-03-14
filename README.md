# Arcana

Application mobile ésotérique (iOS + Android) qui croise astrologie, numérologie et lithothérapie pour générer un profil personnel unique — le "grimoire de naissance".

## Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Mobile | React Native + Expo | SDK 55 |
| Backend | Node.js + Express | 24 LTS |
| Base de données | MySQL | 8.4 LTS |
| ORM | Sequelize | 6.x |
| Monorepo | pnpm workspaces | 10.x |
| Calcul astral | astronomia (Meeus) | 4.x |
| IA narrative | Claude API (Sonnet) | claude-sonnet-4-5 |
| VPS | OVH Ubuntu | 24.04 LTS |
| CI/CD | GitHub Actions | — |

## Architecture
arcana/
├── apps/
│   ├── mobile/          # React Native (Expo SDK 55)
│   └── api/             # Node.js Express backend
├── packages/
│   └── engine/          # Moteur de calcul partagé (JS pur)
│       ├── astroEngine.js      # Calcul thème natal (astronomia)
│       ├── numerology.js       # Numérologie duale (pyth + kab)
│       ├── crossEngine.js      # Croisement astro × numéro
│       ├── lithotherapy.js     # Recommandation pierres
│       ├── stones.json         # Base de 22 pierres
│       └── index.js
└── .github/
    └── workflows/
        ├── ci.yml          # Tests sur PR
        └── deploy.yml      # Deploy SSH → VPS OVH

## Principes d'architecture

**Calculs on-device / on-server** : tout le moteur (`packages/engine`) tourne en JavaScript pur — aucune dépendance native, aucun serveur nécessaire pour les calculs. Seuls deux appels réseau existent :
1. Géocoding Nominatim (OSM) — convertit la ville de naissance en coordonnées GPS
2. Claude API — génère l'interprétation narrative du profil

**Cache immuable** : le profil de base (thème natal + numérologie + croisement) est calculé une seule fois à la création du grimoire et stocké définitivement en MySQL. Aucun recalcul, aucun coût récurrent.

**Monorepo pnpm workspaces** : le package `@arcana/engine` est partagé entre `apps/api` et `apps/mobile` via workspace linking.

## Modèle de données MySQL
users              id, email, password_hash, first_name
grimoires          id, user_id, first_name, last_name, birth_date, birth_time,
                   birth_city, birth_lat, birth_lon, timezone, is_own
natal_charts       id, grimoire_id, planets_json, ascendant, midheaven,
                   houses_json, julian_day, house_system, time_known
num_profiles       id, grimoire_id, pyth_json, kab_json, synthesis_json
crossed_profiles   id, grimoire_id, archetype_axes_json, convergences_json,
                   tensions_json, dominants_json, lacks_json, stones_json
narratives         id, grimoire_id, text, model, tokens_used
share_tokens       id, sender_id, grimoire_id, token, recipient_email,
                   expires_at, claimed_at

Les données calculées sont stockées en colonnes TEXT (JSON sérialisé) — structure complexe et immuable, pas de valeur à normaliser.

## Moteur de calcul (`packages/engine`)

### Astrologie — `astroEngine.js`
- Calcul du Soleil via formules de Meeus ch.25 (précision ~0.01°)
- Calcul de la Lune via `moonposition` (astronomia)
- Planètes Mercure → Neptune via VSOP87B (données `vsop87B*.js`)
- Ascendant + Milieu du Ciel via temps sidéral local
- Système de maisons Equal House
- Détection de rétrogradation par comparaison J et J+1
- Entrée : `{ isoDate, timeStr, latDeg, lonDeg, tzOffsetH }`
- Sortie : `{ planets[], ascendant, midheaven, houses[], julianDay, timeKnown }`

### Numérologie — `numerology.js`
- Double système : **Pythagoricien** (Y=voyelle) + **Kabbalistique** (Y=consonne, F=8, H=5, O=7...)
- 6 nombres calculés : chemin de vie, expression, âme, personnalité, hérédité, anniversaire
- Nombres maîtres préservés : 11, 22, 33
- Normalisation des accents (NFD) pour les prénoms français
- `computeDual(firstName, lastName, birthDate)` → `{ pythagorean, kabbalistic, deltas }`

### Croisement — `crossEngine.js`
- Matrice planètes ↔ chiffres ↔ éléments (Feu/Terre/Air/Eau)
- 9 axes archétypaux : leadership, intuition, créativité, structure, transformation, communication, amour, spiritualité, pouvoir
- Score 0–100 par axe, pondéré par poids planétaire et compatibilité élémentaire
- Détection de convergences et tensions fortes
- `crossProfiles(natal, numEntries)` → `{ archetypeAxes, convergences, tensions, dominants, lacks }`

### Lithothérapie — `lithotherapy.js`
- 4 types de recommandation : apporter (axe < 35), amplifier (> 72), équilibrer (tension), protéger (> 85)
- Matching pierre ↔ candidature par score de compatibilité archétypale
- Règle de diversité : jamais deux pierres pour le même axe
- `selectStones(archetypeAxes, tensions, count)` → `[{ name, color, action, arch, why }]`

## API Routes

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/register` | — | Créer un compte |
| POST | `/api/auth/login` | — | Se connecter |
| GET | `/api/auth/me` | JWT | Profil utilisateur |
| POST | `/api/grimoire` | JWT | Créer un grimoire complet |
| GET | `/api/grimoire` | JWT | Lister ses grimoires |
| GET | `/api/grimoire/:id` | JWT | Détail d'un grimoire |
| POST | `/api/interpret/:grimoireId` | JWT | Générer la narrative Claude |
| POST | `/api/share` | JWT | Créer un grimoire partagé |
| GET | `/api/share/:token` | — | Accéder à un grimoire partagé |
| POST | `/api/share/:token/claim` | JWT | Réclamer un grimoire partagé |

## Installation locale (WSL Ubuntu 24.04)

### Prérequis
```bash
# Node.js 24 LTS via nvm
nvm install 24 && nvm use 24

# pnpm
npm install -g pnpm

# MySQL 8.4
sudo apt install mysql-server
sudo service mysql start
```

### Setup
```bash
# Cloner le repo
git clone git@github.com:FredericAssemat/arcana.git
cd arcana

# Installer toutes les dépendances (workspaces)
pnpm install

# Créer la base de données
sudo mysql -u root -p -e "
  CREATE DATABASE arcana CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER 'arcana_user'@'localhost' IDENTIFIED BY 'votre_mot_de_passe';
  GRANT ALL PRIVILEGES ON arcana.* TO 'arcana_user'@'localhost';
  FLUSH PRIVILEGES;
"

# Configurer l'environnement
cp apps/api/.env.example apps/api/.env
# Éditer apps/api/.env avec vos valeurs (DB_PASS, ANTHROPIC_API_KEY...)

# Lancer les migrations
cd apps/api && npx sequelize-cli db:migrate

# Lancer les tests du moteur
node packages/engine/test/validation.js
# → 13/13 tests verts attendus

# Démarrer l'API en dev
pnpm dev
# → Arcana API démarrée sur le port 3000
```

### Vérification rapide
```bash
# Santé de l'API
curl http://localhost:3000/health

# Créer un compte
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@arcana.app","password":"Test@1234","firstName":"Test"}'

# Créer un grimoire (remplacer TOKEN par le JWT reçu)
curl -X POST http://localhost:3000/api/grimoire \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"firstName":"Marie","lastName":"Dupont","birthDate":"1990-03-14","birthTime":"08:35","birthCity":"Paris, France","timezone":"Europe/Paris"}'
```

## Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NODE_ENV` | Environnement | `development` |
| `PORT` | Port de l'API | `3000` |
| `DB_HOST` | Hôte MySQL | `localhost` |
| `DB_PORT` | Port MySQL | `3306` |
| `DB_NAME` | Nom de la base | `arcana` |
| `DB_USER` | Utilisateur MySQL | `arcana_user` |
| `DB_PASS` | Mot de passe MySQL | — |
| `JWT_SECRET` | Secret JWT | — |
| `JWT_EXPIRES_IN` | Durée du token | `30d` |
| `ANTHROPIC_API_KEY` | Clé API Claude | `sk-ant-...` |
| `REDIS_URL` | URL Redis (queue) | `redis://localhost:6379` |
| `API_SECRET` | Secret header interne | — |
| `APP_URL` | URL publique de l'app | `https://arcana.app` |

## Notes pour les nouveaux développeurs

**Ajouter une planète ou un astre** : modifier `PLANETS` dans `astroEngine.js` et ajouter les données VSOP87B correspondantes. Mettre à jour `PLANET_MAP` dans `crossEngine.js`.

**Modifier les seuils lithothérapie** : `THRESHOLDS` dans `lithotherapy.js`. Le seuil `lack` à 35 signifie qu'un axe sous 35/100 reçoit une recommandation "apporter".

**Ajouter une pierre** : ajouter une entrée dans `stones.json` en respectant le schéma existant. Le champ `tensionBridge` liste les éléments que cette pierre peut ponter.

**Modifier le prompt Claude** : fonction `buildPrompt()` dans `apps/api/src/routes/interpret.js`. Les données du profil structuré sont injectées dynamiquement — ne jamais hardcoder de données utilisateur dans le prompt système.

**Modifier le système numérologique** : tables `TABLES` dans `numerology.js`. Chaque lettre de a à z a une valeur dans chaque système. Le Y est voyelle en pythagoricien, consonne en kabbalistique.

## État du projet

- [x] Phase 1 — Moteur de calcul (`packages/engine`) — **terminé**
- [x] Phase 2 — Backend Node.js + MySQL (`apps/api`) — **terminé**
- [ ] Phase 3 — Provisioning VPS OVH
- [ ] Phase 4 — CI/CD GitHub Actions
- [ ] Phase 5 — App React Native (`apps/mobile`)
- [ ] Phase 6 — Partage + stores iOS/Android

## Licence

Propriétaire — tous droits réservés.
