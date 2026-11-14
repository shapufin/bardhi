# 01 — Arkitektura & Stack-u Teknik

## Çfarë Duhet të Jetë e Vërtetë (Invariants)
1. Aplikacioni ekzekutohet si një Next.js App Router i unifikuar në React 19 me PayloadCMS v3.
2. Payload v3 konfigurohet te `src/payload.config.ts` dhe ekzekutohet brenda Next.js (pa pasur nevojë për proces të dytë serveri në sfond).
3. Baza e të dhënave është SQLite lokalisht (`data/arkivi.db`) duke përdorur `@payloadcms/db-sqlite`. Në prodhim mund të kalojë në Docker PostgreSQL (`@payloadcms/db-postgres`) thjesht duke ndryshuar adapterin dhe variablin `DATABASE_URI`.

## Ku Ndodhet Kodi
- Konfigurimi Payload: `src/payload.config.ts`
- Rrugët Next.js të Payload: `src/app/(payload)/admin/[[...segments]]/page.tsx` dhe `src/app/(payload)/api/[...slug]/route.ts`
- Rrugët e Frontend-it: `src/app/(frontend)/page.tsx` dhe `src/app/(frontend)/studio/page.tsx`
- Rrugët e Përshtatura API: `src/app/api/cms/route.ts`, `src/app/api/site/route.ts`, `src/app/api/stories/route.ts`, etj.

## Çfarë Nuk Duhet të Bëhet
- Mos ndani frontend-in dhe backend-in në dy porte të ndryshme në prodhim; Next.js dhe Payload ekzekutohen së bashku në të njëjtin port.
- Mos fshini rrugët e posaçme `/api/cms` sepse ato sigurojnë sinkronizim të drejtpërdrejtë me `CmsContext`.

## Verifikimi
```powershell
bun run lint
bun run build
```
