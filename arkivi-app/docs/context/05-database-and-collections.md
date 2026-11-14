# 05 — Baza e të Dhënave & Skemat e PayloadCMS v3

## Çfarë Duhet të Jetë e Vërtetë (Invariants)
1. Baza lokale është SQLite (`data/arkivi.db`) përmes `@payloadcms/db-sqlite`.
2. Të gjitha koleksionet dhe globalet janë të përkthyera në gjuhën shqipe (`locale: 'sq'`).
3. Të dhënat janë të ndara në:
   - **Koleksione**:
     - `users`: Përdoruesit me rolet `author` dhe `superuser`.
     - `stories`: Rrëfimet dhe letrat me periudha, minuta leximi, kapak, dhe paragrafë.
     - `book-spreads`: Fletët dyshe të librit të renditura me `sortOrder` dhe blloqe të shumëllojshme.
     - `media`: Skedarët fotografikë me raport pamjeje dhe diçitura.
     - `timeline-entries`: Pikat e renditura të kronologjisë së jetës.
   - **Globale**:
     - `memorial-profile`: Titulli i faqes, të dhënat e kushtimit dhe lidhjet e menysë.
     - `hero-settings`: Ballina kryesore, animacioni dhe rrëfimi i veçuar.
     - `home-layout`: Renditja e seksioneve dinamike dhe thënia arkivore.

## Ku Ndodhet Kodi
- Konfigurimi Kryesor: `src/payload.config.ts`
- Koleksionet: `src/collections/`
- Globalet: `src/globals/`
- Lidhësi i të Dhënave: `src/lib/payloadClient.ts` dhe `data/cms-data.json`

## Çfarë Nuk Duhet të Bëhet
- Mos fshini fusha nga skemat e Payload pa azhurnuar tipet në `src/types/cms.ts` dhe frontend-in përkatës.
- Mos ruani imazhe pa përcaktuar `aspectRatio` përkatës, pasi ai ndihmon në renditjen harmonike të galerisë mozaik.

## Verifikimi
```powershell
bun run lint
bun run payload generate:types
```
