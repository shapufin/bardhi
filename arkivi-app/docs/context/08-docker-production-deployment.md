# 08 — Udhëzuesi i Vendosjes në Prodhim me Docker (Production Deployment)

Ky dokument përmban udhëzimet hap pas hapi për ngritjen dhe menaxhimin e aplikacionit në serverin tuaj të prodhimit me Docker dhe Docker Compose.

---

## 1. Struktura e Skedarëve Docker

| Skedari | Vendndodhja | Funksioni |
|---|---|---|
| `Dockerfile` | `arkivi-app/Dockerfile` | Ndërtim multi-stage me `node:20-bookworm-slim` (mbështetje native për Sharp WebP dhe SQLite) |
| `docker-compose.yml` | Root & `arkivi-app/` | Konfigurimi i shërbimit, portës `3001`, vëllimeve të persistencës dhe healthcheck |
| `docker-entrypoint.sh` | `arkivi-app/docker-entrypoint.sh` | Skript hyrës që inicializon dosjet, kryen seeding automatik dhe krijon superadminin nëse mungon |
| `.env.example` | Root & `arkivi-app/` | Shembull me të gjithë variablat e mjedisit dhe kredencialet fillestare |
| `.dockerignore` | `arkivi-app/.dockerignore` | Përjashton skedarët e panevojshëm dhe gjithçka runtime/sekrete (`.env*`, `data/*.db`, `cms-data.json`, `public/uploads/*`, `backups`) nga imazhi; test: `tests/dockerignore.test.ts` |

---

## 2. Hapat e Vendosjes në Serverin e Prodhimit

### Hapi 1: Kopjoni variablat e mjedisit
```bash
cp .env.example .env
```
Hapni `.env` me editor (`nano .env`) dhe ndryshoni:
- `NEXT_PUBLIC_SERVER_URL` me domenin tuaj (p.sh. `https://arkivi.al`).
- `PAYLOAD_SECRET` me një çelës të gjatë e të sigurt (`openssl rand -hex 32`).
- `ADMIN_SECRET` me një çelës sekret për mbrojtjen e API-ve (studio token + endpoints administrative). Opsionalisht `STUDIO_TOKEN` i dedikuar.
- `INITIAL_ADMIN_PASSWORD` me një fjalëkalim të sigurt për superadminin — nëse mungon, sistemi gjeneron një të rastësishëm dhe e printon në loget e nisjes.
- Healthcheck-u i kontejnerit kontrollon `GET /api/cms` (200 OK).

### Hapi 2: Ndërtoni dhe nisni kontejnerin
```bash
docker compose up -d --build
```

### Hapi 3: Kontrolloni gjendjen dhe regjistrat (logs)
```bash
docker compose logs -f arkivi-app
```

---

## 3. Qasja në Sistemin e Prodhimit

- **Faqja Publike e Përkujtimit:** `http://IP_OSE_DOMENI:3001/`
- **Studio e Autorit (e thjeshtë, pa fjalëkalim):** `http://IP_OSE_DOMENI:3001/studio`
- **Paneli Teknik Administrativ (Payload):** `http://IP_OSE_DOMENI:3001/admin`
  - *Email:* `admin@arkivi.local` (ose ai që keni caktuar te `.env`)
  - *Fjalëkalimi:* ai që keni caktuar te `INITIAL_ADMIN_PASSWORD` në `.env` (nëse mungon, shihni logun e nisjes për fjalëkalimin e gjeneruar automatikisht)

---

## 4. Persistenca e të Dhënave (Volumes)

Të dhënat ruhen jashtë kontejnerit në host në dosjet:
- `./data` → Baza e të dhënave SQLite (`arkivi.db`) dhe gjendja JSON (`cms-data.json`).
- `./public/uploads` → Të gjitha fotografitë e ngarkuara dhe të kompresuara në WebP.
- `./backups` → Të gjitha arkivat e krijuara nga sistemi i rezervimit.

---

## 5. Komandat e Dobishme të Mirëmbajtjes

### Krijimi i një kopjeje rezervë nga jashtë kontejnerit:
```bash
docker compose exec arkivi-app npm run backup
```

### Rivendosja nga një arkiv:
```bash
docker compose exec arkivi-app npm run restore backups/backup-EMRI.zip
```

### Rinisja e shërbimit:
```bash
docker compose restart arkivi-app
```
