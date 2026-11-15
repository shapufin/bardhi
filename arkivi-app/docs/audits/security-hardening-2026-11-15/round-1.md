# Sigurimi & Pastrim i Repository-t — Audit 2026-11-15

> Raundi i dytë i auditit pas `full-audit-2026-11-14`. Fokus: siguria e endpoint-eve, portabiliteti i backup/restore në prodhim, higjiena e repository-t dhe heqja e mockup-it.

## Përmbledhje

| Metрика | Round 1 (plan) | Round 2 (ky raund) |
|---|---|---|
| Finding-e CRITICAL | 2 (të verifikuara live) | 0 të hapura |
| Finding-e HIGH | 4 | 0 të hapura |
| Finding-e MEDIUM | 5 | 1 e mbetur (e dokumentuar) |
| Teste | 51 | **67 passing** (+16 boundary auth) |
| `tsc --noEmit` | 0 gabime | 0 gabime |

## Finding-e e zgjidhura

| ID | Problemi | Zgjidhja | Commit |
|---|---|---|---|
| C1 | `GET /api/backup` pa auth — shkarkim i DB-së me hash-e fjalëkalimesh | `verifyAdminAuth` i detyrueshëm | `fix(security)` |
| C2 | `POST /api/restore` pa auth — overwrite i plotë i gjendjes | Auth + kufi 200MB + valida path-esh | `fix(security)` + `feat(backup)` |
| H1 | Të gjitha endpoint-et e mutacionit pa auth | Token i fshehtë i injektuar nga `/studio` (`x-admin-token`); autori nuk shkruan asgjë | `fix(security)` |
| H2 | Healthcheck Docker → `/api/site` (405 përgjithmonë) | `/api/cms` (200) në compose + Dockerfile | `fix(infra)` |
| H3 | Backup/restore vareshin nga PowerShell (absent në Linux) | Motor i përbashkët jszip `src/lib/backupArchive.ts` për API + CLI | `feat(backup)` |
| H4 | `INITIAL_ADMIN_PASSWORD=Arkivi2026!` i komituar | Placeholder në `.env.example`, fallback i hequr nga compose, seed gjeneron random në prodhim | `fix(infra)` |
| M1 | Fallback i hardcoduar i `PAYLOAD_SECRET` në routes | Hequr — vetëm env | `fix(security)` |
| M2 | `PUT /api/media/[id]` spread pa filter | Whitelist fushash + validim | `fix(security)` |
| M3 | `DELETE /api/media/[id]` pa kontroll referencash | HTTP 409 kur fotoje është në përdorim | `fix(security)` |
| M4 | Pa kufij madhësie/gjatësie në payload-e | Caps në të gjitha routes mutative | `fix(security)` |
| — | `.env` me `PAYLOAD_SECRET` i komituar në histori | Untracked + gitignore + rotacion i sekretit lokal | `chore(repo)` |
| — | Mockup `në-kujtim-të-dritan-berishës/` + `graphify-out/` + `.trace-mcp/` | Hequr nga repo | `chore(repo)` |

## E dokumentuar / e shtyrë (backlog)

- **Token-i i studios në HTML**: `studioToken` shfaqet te source-i i `/studio` — ndalon vandalizmin e rastësishëm, por jo një sulmues të vendosur. Nëse kreqet më shumë, kaloni te cookies session me `/admin`.
- **`getCmsState` reset-on-corrupt**: JSON i dëmtuar rikthehet te `DEFAULT_CMS_STATE` (me `.corrupt.bak`). Sjellje e qëllimshme, por e jashtëzakonshme — kandidate për shënim monitoring.
- **Histori e git**: `PAYLOAD_SECRET` i vjetër mbetet në commit-et e vjetra. Nëse repo bëhet publike, kryeni `git filter-repo` + force-push dhe rrotulloni të gjitha sekretet.
- **Rate limiting**: nuk u shtua — pas auth-it, mutacionet kërkojnë token; GET-et janë read-only.

## Verifikimi

- `npm test`: **67/67 pass** (përfshirë 16 teste të reja `admin-auth.test.ts`: 401 pa token, 403 me token të gabuar, 200 me token, GET-et publike të hapura)
- `npx tsc --noEmit`: 0 gabime
- Live: `/api/backup` → 401 pa token / 200 ZIP me token; `POST /api/stories` → 401/200; `/studio` renderon të 6 tab-et
- Browser: asnjë horizontal overflow në 1440px/280px, 0 console errors

## Shënim për prodhim

Para `docker compose up` në server: vendosni `PAYLOAD_SECRET` (të ri), `ADMIN_SECRET` dhe `INITIAL_ADMIN_PASSWORD` të forta në `.env` — shembujt janë vetëm placeholderë.
