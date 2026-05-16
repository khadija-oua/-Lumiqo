<div align="center">

# 🌟 Lumiqo

### Plateforme d'apprentissage adaptatif alimentée par l'IA

*Apprendre, à votre façon.*

[![Made with React](https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react)](https://react.dev/)
[![Backend Node](https://img.shields.io/badge/Backend-Node.js_20-339933?logo=node.js)](https://nodejs.org/)
[![Database MySQL](https://img.shields.io/badge/Database-MySQL_8-4479A1?logo=mysql)](https://www.mysql.com/)
[![AI Gemini](https://img.shields.io/badge/AI-Google_Gemini-4285F4?logo=google)](https://ai.google.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://www.docker.com/)

</div>

---

## 📖 À propos

**Lumiqo** est une plateforme d'apprentissage en ligne qui personnalise l'expérience pédagogique de chaque étudiant grâce à trois agents d'intelligence artificielle qui collaborent :

- 🧠 **Quiz Agent** — Génère automatiquement des QCM adaptatifs en français à partir de PDFs de cours
- 💬 **Chatbot pédagogique (Lumi)** — Assiste les étudiants en temps réel avec mémoire conversationnelle et adaptation au style d'apprentissage
- 🎯 **Profiling Agent** — Analyse le style VARK de l'étudiant (Visuel / Auditif / Lecture / Kinesthésique) et génère un parcours d'apprentissage personnalisé

La plateforme prend en charge trois rôles (étudiant, enseignant, administrateur) et offre une gestion complète de cours, un suivi de progression, des évaluations intelligentes et une assistance temps réel.

---

## ✨ Fonctionnalités principales

### 🎓 Pour les étudiants
- 📚 Inscription aux cours et accès aux supports PDF
- 🎮 Quiz adaptatifs dont la difficulté évolue selon les performances (fenêtre roulante 2 réponses)
- 💡 Chatbot pédagogique multi-tours avec contexte de cours injecté
- 🎨 Questionnaire VARK pour identifier son style d'apprentissage dominant
- 🗺️ Parcours d'apprentissage personnalisé généré par IA, mis à jour automatiquement après chaque quiz

### 👨‍🏫 Pour les enseignants
- 📝 Création et gestion de cours
- 📤 Upload de supports PDF stockés sur Google Drive
- ⚡ Génération automatique de quiz à partir d'un PDF (1 clic, ~30 secondes)
- 📊 Suivi des résultats par étudiant et par quiz

### 👤 Pour les administrateurs
- 👥 Gestion globale des utilisateurs et des rôles
- 📈 Vue d'ensemble de la plateforme

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                       │
│   Pages • TanStack Query • Axios • Dark Mode • Mobile Responsive │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST API
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Backend (Node.js + Express)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │   Auth   │  │  Courses │  │  Materials   │  │  Quizzes    │  │
│  │   JWT    │  │ Enrolls  │  │ (Drive PDFs) │  │  Attempts   │  │
│  └──────────┘  └──────────┘  └──────────────┘  └─────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                     AI Agents Layer                       │    │
│  │  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐  │    │
│  │  │ Quiz Agent │  │Chatbot Agent │  │ Profiling Agent  │  │    │
│  │  │  (PDF →    │  │ (multi-turn  │  │  (VARK + path)   │  │    │
│  │  │   MCQ)     │  │  + VARK)     │  │                  │  │    │
│  │  └────────────┘  └──────────────┘  └──────────────────┘  │    │
│  └──────────────────────────────────────────────────────────┘    │
└────────┬─────────────────────┬─────────────────────┬────────────┘
         │                     │                     │
         ▼                     ▼                     ▼
   ┌──────────┐         ┌─────────────┐      ┌──────────────┐
   │  MySQL   │         │ Google Drive│      │ Gemini API   │
   │ 14 tables│         │  (OAuth 2.0)│      │ (gemini-2.5- │
   │  InnoDB  │         │  PDF store  │      │ flash-lite)  │
   └──────────┘         └─────────────┘      └──────────────┘
```

---

## 🛠️ Stack technique

### Frontend
| Technologie | Usage |
|---|---|
| **React 18** + **Vite** | UI et build moderne avec hot reload |
| **React Router v6** | Routing avec guards par rôle (AuthGuard, RoleGuard) |
| **TanStack Query** | Cache serveur et gestion d'état asynchrone |
| **Axios** | Client HTTP avec interceptor auto-logout sur 401 |
| **Lucide React** | Bibliothèque d'icônes |
| **CSS Variables** | Design tokens complets, dark mode natif |

### Backend
| Technologie | Usage |
|---|---|
| **Node.js 20** + **Express** | Serveur API REST |
| **MySQL 8** + **mysql2** | Base de données relationnelle, requêtes paramétrées |
| **JWT** + **bcryptjs** | Authentification (hash 12 rounds) |
| **express-validator** | Validation et sanitisation des entrées |
| **multer** | Upload multipart en mémoire (25 MB max) |
| **helmet**, **cors**, **morgan** | Sécurité et observabilité |
| **express-rate-limit** | Protection contre les abus |

### Intelligence Artificielle
| Technologie | Usage |
|---|---|
| **Google Gemini 2.5 Flash Lite** | Génération de quiz, chat, parcours |
| **Structured output** (`responseSchema`) | Sorties JSON contraintes et validées |
| **pdf-parse** | Extraction de texte depuis les PDFs |

### Infrastructure
| Technologie | Usage |
|---|---|
| **Docker** + **Docker Compose** | 3 services orchestrés (frontend, backend, mysql) |
| **Google Drive API** (OAuth 2.0) | Stockage des PDFs de cours |
| **nodemon** + **Vite HMR** | Hot reload en développement |

---

## 🚀 Démarrage rapide

### Prérequis
- **Docker Desktop** ([télécharger](https://www.docker.com/products/docker-desktop/))
- **Compte Google** (Gmail personnel pour Drive + Gemini)
- **Git**

### Installation en 5 étapes

```bash
# 1. Cloner le repo
git clone https://github.com/<votre-utilisateur>/lumiqo.git
cd lumiqo

# 2. Configurer les variables d'environnement
cp .env.example .env
# → Éditez .env avec vos clés (voir section Configuration ci-dessous)

# 3. Lancer tous les services
docker compose up --build -d

# 4. Insérer les données de démonstration
docker compose exec backend npm run seed

# 5. Ouvrir l'application
# → http://localhost:5173
```

### Vérification

```bash
# Backend OK ?
curl http://localhost:5000/health
# → {"status":"ok"}

# Tables créées ?
docker compose exec mysql mysql -u root -p -e "USE lumiqo; SHOW TABLES;"
# → 14 tables
```

---

## 🔑 Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| 👤 Admin | `admin@lumiqo.local` | `Admin123!` |
| 👨‍🏫 Enseignant | `teacher1@lumiqo.local` | `Teacher123!` |
| 🎓 Étudiant | `student1@lumiqo.local` | `Student123!` |

---

## ⚙️ Configuration des variables d'environnement

Copiez `.env.example` vers `.env` et remplissez chaque section.

### Base de données

```env
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=lumiqo
MYSQL_USER=lumiqo_user
MYSQL_PASSWORD=lumiqo_pass
DB_HOST=mysql
DB_PORT=3306
DB_NAME=lumiqo
DB_USER=lumiqo_user
DB_PASSWORD=lumiqo_pass
```

### Auth

```env
JWT_SECRET=votre_secret_jwt_tres_long_et_aleatoire
```

### Gemini API

1. Allez sur [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Cliquez **"Create API key"** → sélectionnez votre projet GCP
3. Copiez la clé :

```env
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash-lite
```

### Google Drive (OAuth 2.0)

> **Pourquoi OAuth et pas service account ?**
> Les service accounts ont un quota de stockage de 0 Go sur un compte Gmail personnel. OAuth user auth utilise les 15 Go gratuits de votre compte.

**Étape 1 — Préparer GCP**

1. Créez un projet sur [Google Cloud Console](https://console.cloud.google.com/)
2. Activez l'API **Google Drive**
3. **APIs & Services → OAuth consent screen** → External → remplissez les infos → ajoutez votre Gmail en *Test user*
4. **Credentials → Create OAuth Client ID** → type *Web Application*
5. Ajoutez comme redirect URI autorisée : `http://localhost:3000/oauth/callback`
6. Copiez **Client ID** et **Client Secret**

**Étape 2 — Configurer `.env`**

```env
GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-...
GOOGLE_OAUTH_REFRESH_TOKEN=   # à remplir à l'étape suivante
GOOGLE_DRIVE_FOLDER_ID=       # à remplir à l'étape suivante
```

**Étape 3 — Créer le dossier Drive**

1. Ouvrez [drive.google.com](https://drive.google.com) avec le compte autorisé
2. Créez un dossier `Lumiqo`
3. Copiez l'ID depuis l'URL : `https://drive.google.com/drive/folders/<FOLDER_ID>`
4. Collez dans `GOOGLE_DRIVE_FOLDER_ID=<FOLDER_ID>`

**Étape 4 — Générer le refresh token**

```bash
# Exposer le port 3000 dans docker-compose.yml (backend service)
# ports:
#   - "5000:5000"
#   - "3000:3000"    ← ajouter cette ligne

docker compose down && docker compose up -d

# Lancer le script
docker compose exec backend npm run drive:token
```

- Copiez l'URL affichée dans votre navigateur
- Connectez-vous avec le compte Gmail autorisé
- Autorisez l'application (cliquez "Paramètres avancés" si Google affiche un avertissement)
- Le terminal affiche le refresh token → copiez-le dans `GOOGLE_OAUTH_REFRESH_TOKEN=...`

**Étape 5 — Redémarrer**

```bash
docker compose down && docker compose up -d
```

---

## 📂 Structure du projet

```
lumiqo/
├── backend/
│   ├── src/
│   │   ├── agents/
│   │   │   ├── quizAgent.js          # PDF → Gemini → MCQ adaptatifs
│   │   │   ├── chatbotAgent.js       # Multi-turn + VARK + anti-triche
│   │   │   ├── profilingAgent.js     # VARK scoring + parcours IA
│   │   │   └── prompts/              # Prompts Gemini centralisés (FR)
│   │   ├── controllers/              # Logique HTTP par ressource
│   │   ├── services/                 # Logique métier + accès DB
│   │   │   ├── gemini.service.js     # Client Gemini partagé
│   │   │   ├── drive.service.js      # Google Drive OAuth
│   │   │   ├── pdf.service.js        # Extraction texte PDF
│   │   │   └── access.service.js     # Règles d'accès centralisées
│   │   ├── routes/                   # Express routes
│   │   ├── middleware/               # auth, validation, upload, errors
│   │   ├── data/
│   │   │   └── varkQuestions.fr.json # 16 questions VARK originales
│   │   ├── config/db.js              # Pool MySQL
│   │   └── server.js
│   ├── scripts/
│   │   ├── seed.js                   # Données de démonstration
│   │   └── get-refresh-token.js      # Générateur OAuth token
│   ├── credentials/                  # (gitignored)
│   ├── test-files/                   # PDFs de test (gitignored)
│   └── api.http                      # Tests REST Client complets
├── frontend/
│   ├── src/
│   │   ├── components/               # Logo, Button, Modal, Avatar, ...
│   │   ├── pages/                    # Login, Dashboard, Course, Quiz, Chat, VARK, ...
│   │   ├── api/                      # Clients axios par domaine
│   │   ├── context/AuthContext.jsx   # État global authentification
│   │   ├── styles/
│   │   │   ├── tokens.css            # Variables CSS design system
│   │   │   └── global.css
│   │   └── i18n/fr.js                # Toutes les chaînes FR centralisées
│   ├── public/favicon.svg
│   └── index.html
├── db/
│   └── init.sql                      # Schéma 14 tables, InnoDB, utf8mb4
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🗄️ Schéma de base de données

14 tables, InnoDB, utf8mb4, FK avec ON DELETE CASCADE / SET NULL.

```
users
 ├── courses (teacher_id FK)
 │    ├── enrollments (student_id FK)
 │    ├── course_materials (drive_file_id)
 │    │    └── quizzes
 │    │         └── questions
 │    │              └── answers
 │    └── learning_paths (student_id FK)
 ├── quiz_attempts
 │    └── attempt_answers
 ├── vark_profiles (UNIQUE student_id)
 ├── vark_responses
 └── chat_sessions
      └── chat_messages
```

Voir [`db/init.sql`](db/init.sql) pour la définition complète avec index et contraintes.

---

## 🤖 Détail des agents IA

### 🧠 Quiz Agent (`quizAgent.js`)

```
PDF (Drive) → stream → pdf-parse → text
    ↓ si > 25 000 chars
chunk (3 parties) → résumé Gemini par chunk → concaténation
    ↓
Gemini generateContent (responseSchema strict)
    ↓ validation
  4 options / 1 correcte / difficulté V1 ✓ → retry si invalide
    ↓
Transaction : INSERT quiz + questions + answers
```

**Logique adaptative :**
- Fenêtre roulante de 2 réponses
- ✅✅ → step up (easy → medium → hard)
- ❌❌ → step down (hard → medium → easy)
- Cap à 10 questions par attempt

### 💬 Chatbot Agent — Lumi (`chatbotAgent.js`)

- **Mémoire** : 20 derniers messages mappés en historique Gemini (alternance user/model)
- **Contexte de cours** : titre, description, liste des supports injectés dans le system primer
- **Adaptation VARK** : hint spécifique par style (visuel → diagrammes, auditif → analogies, etc.)
- **Défense anti-triche** :
  - Couche 1 : filtre regex (8 patterns FR/EN) → refus sans appel Gemini
  - Couche 2 : instruction dans le system primer → Gemini refuse même les formulations contournées
- **Rate limit** : 30 messages / 5 min / utilisateur (mémoire, clé `user:<id>`)
- **Rollback** : si Gemini échoue, le message étudiant est supprimé pour préserver l'alternance

### 🎯 Profiling Agent (`profilingAgent.js`)

- **Questionnaire** : 16 questions VARK originales en français, multi-select V/A/R/K
- **Scoring** : comptage des styles sélectionnés, tie-break V > A > R > K
- **Parcours** : Gemini reçoit (materials du cours + profil VARK + stats tentatives) → génère ordre recommandé + difficulté + 2-3 conseils pédagogiques adaptés au style
- **Auto-refresh** : déclenché automatiquement à chaque quiz complété (synchrone, TODO queue BullMQ)

---

## 🔐 Sécurité

| Mesure | Détail |
|---|---|
| **JWT** | Expiration 7 jours, payload minimal `{userId, role, email}` |
| **Mots de passe** | bcryptjs 12 rounds, jamais retournés en réponse |
| **Helmet** | Headers HTTP sécurisés (CSP, HSTS, X-Frame, etc.) |
| **CORS strict** | `http://localhost:5173` uniquement en dev |
| **Rate limiting** | Auth : 10 req / 15 min. Chat : 30 msg / 5 min |
| **Validation** | express-validator sur tous les inputs (XSS, format, longueur) |
| **SQL** | Requêtes paramétrées mysql2 uniquement — pas d'injection possible |
| **Transactions DB** | Rollback sur toute écriture multi-tables (quiz gen, VARK submit) |
| **Drive OAuth** | Scope `drive`, refresh token stocké en env var, jamais exposé au client |

---

## 🧪 Tests API

Le fichier [`backend/api.http`](backend/api.http) couvre **tous les endpoints** avec :

- Variante sans token → `401`
- Variante mauvais rôle → `403`
- Variante propriétaire incorrect → `403`
- Happy path → `200` / `201`
- Cas de validation → `400`
- Cas d'erreur métier → `409`, `422`, `502`

Compatible avec l'extension [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) pour VS Code.

---

## 📋 Décisions techniques notables

| Décision | Justification |
|---|---|
| **Gemini 2.5 Flash Lite** | Latence faible, coût quasi nul, JSON structuré supporté, moins de 503 en pic que 2.5 Flash |
| **OAuth 2.0 user** (pas service account) | Service account = 0 Go quota sur Gmail perso. OAuth utilise les 15 Go du compte |
| **Scope Drive `drive`** | `drive.file` ne permet pas d'écrire dans un dossier créé manuellement |
| **`gemini.service.js` partagé** | DRY entre les 3 agents, gestion centralisée retry/erreurs |
| **Structured output + validation stricte** | Retry sur JSON invalide plutôt que "best effort" — intégrité DB garantie |
| **`access.service.ensureCourseReadAccess`** | Single source of truth : admin / enseignant-owner / étudiant-inscrit |
| **Auto-refresh synchrone** | Simple pour MVP, TODO queue BullMQ/Redis pour éviter la latence finale |
| **Chatbot rollback sur échec Gemini** | Préserve l'invariant d'alternance user/model pour les tours suivants |
| **Filtre regex anti-triche + primer** | Défense en profondeur : économie d'appels API + sécurité contre les contournements |

---

## 🎯 Auteure

**Khadija Ouanour**

