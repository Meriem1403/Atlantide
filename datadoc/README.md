# Données source — Tickets Repas DIRM

Fichiers ODS importés en base via `npm run import-datadoc`.

| Fichier | Contenu |
|---------|---------|
| `PRESTATAIRES TICKETS REPAS.ods` | Liste des restaurants prestataires (nom, ville, téléphone) |
| `calcul des tickets repas JUILLET 2026.ods` | Allocations par service et par agent (juillet 2026) |

## Correspondance applicative

| Donnée ODS | Table / champ |
|------------|----------------|
| Restaurant + ville + tél | `providers` (name, address, phone) |
| Agent + service | `agents` (name, department) |
| Numérotation | `agents.numerotation` + `agent_monthly_plans.numerotation` |
| Tickets à verser | `agent_monthly_plans.ticket_count` |
| Montant (5,24 €…) | `agent_monthly_plans.face_value` + `subsidy` |
| Remarques (RETRAITE, ARRIVÉE…) | `agents.notes` + `agent_monthly_plans.notes` |
| Mois JUILLET 2026 | `agent_monthly_plans.month` = `2026-07` |

## Import

```bash
cd backend
npm run migrate
npm run import-datadoc
```

Ou via API (admin) : `POST /api/datadoc/import`

## Export pour documents

`GET /api/datadoc/report?month=2026-07` — données structurées par service, prêtes pour la génération de documents.
