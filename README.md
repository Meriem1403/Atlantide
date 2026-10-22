# Atlantide

Espace de compatibilité entre les agents, les prestataires et l'administration.

L'application donne un accès par rôle, une API et une base PostgreSQL. Le frontend reste joignable depuis un réseau institutionnel via un proxy sur le même domaine.

## Stack

- React 18, Vite, Tailwind CSS
- Express, JWT, PostgreSQL
- Docker Compose

## Démarrage

```bash
cp .env.example .env
docker compose up --build
```

Le frontend écoute sur le port indiqué dans le compose. Les secrets (base, JWT) se mettent dans `.env`, qui n'est pas versionné.

## Déploiement

`docker-compose.prod.yml` et `nginx.conf` servent le frontend et l'API derrière le même domaine.
