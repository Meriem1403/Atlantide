# Application de tickets repas

Gestion des tickets repas pour agents, prestataires et administrateurs.

Prototype UI issu de [Figma Make](https://www.figma.com/design/dHX3q2rK71iN88oRhR1oni/Application-de-tickets-repas), enrichi d'une API Node.js + PostgreSQL.

## Stack

- **Frontend** : React 18, Vite, Tailwind CSS 4
- **Backend** : Express, JWT, PostgreSQL
- **Infra** : Docker Compose (dev + prod)

## Démarrage rapide (Docker)

```bash
docker compose up --build -d
```

- Frontend : http://localhost:5173
- API : http://localhost:3000/api
- PostgreSQL : localhost:5432
- Emails (dev) : http://localhost:8025 (Mailpit)

### Comptes de démo

| Rôle | Utilisateur | Mot de passe |
|------|-------------|--------------|
| Admin | `admin` | `admin123` |
| Agent | `m.dubois` | `marie2026` |
| Prestataire | `lafourchette` | `prest123` |

## Développement local (sans Docker)

```bash
# Backend
cd backend && cp .env.example .env
npm install && npm run migrate && npm run seed && npm run dev

# Frontend (autre terminal)
npm install && npm run dev
```

## Production

```bash
cp .env.example .env
# Éditer JWT_SECRET et DB_PASSWORD
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Application accessible sur http://localhost (port 80).

## Tests

```bash
cd backend
npm install
npm run migrate && npm run seed
npm test
```

## API principale

| Méthode | Route | Rôle |
|---------|-------|------|
| POST | `/api/auth/login` | public |
| GET | `/api/app-state` | authentifié |
| CRUD | `/api/agents` | admin |
| CRUD | `/api/providers` | admin |
| CRUD | `/api/subventions` | admin |
| POST | `/api/tickets/generate` | admin |
| POST | `/api/tickets/validate` | provider |
| POST | `/api/invoices` | provider |
| PATCH | `/api/invoices/:id/approve` | admin |
