# 05 — Baza e të Dhënave & Skemat e PayloadCMS v3

## Çfarë Duhet të Jetë e Vërtetë (Invariants)
1. **Arkitektura e Dyfishtë e të Dhënave (Dual-Persistence)**:
   - Baza lokale kryesore është SQLite (`data/arkivi.db`) përmes `@payloadcms/db-sqlite`. PostgreSQL nuk është implementuar. Përmbajtja e faqes lexohet nga `cms-data.json`; koleksionet Payload `stories`, `book-spreads`, `media`, `timeline-entries` dhe globalet `memorial-profile`, `hero-settings`, `home-layout` NUK lexohen nga faqja — përdoren vetëm `users` dhe `studio-settings`.
   - Gjendja aktive e përmbajtjes së CMS-it ruhet në mënyrë atomike te `data/cms-data.json` me transaksione të mbrojtura me retry (`atomicWriteFile`).
2. **Lokalizimi i Plotë Shqip**: Të gjitha koleksionet, fushat dhe globalet janë të konfiguruara dhe të përkthyera në gjuhën shqipe (`locale: 'sq'`).
3. **Koleksionet Kryesore**:
   - `users`: Përdoruesit me rolet `author` dhe `superuser`, fjalëkalime të hash-uara dhe menaxhim sesioni.
   - `stories`: Kujtimet dhe letrat memoriale me periudha kohore, minuta leximi, kapak, citat dhe trup paragrafësh.
   - `book-spreads`: Fletët dyshe të librit 3D të renditura me `sortOrder` dhe blloqe të pasura (`prose`, `photo`, `quote`, `handwritten-note`).
   - `media`: Menaxhimi i skedarëve fotografikë. Përmban:
     * Hook-un e sigurisë `beforeValidate` që refuzon çdo skedar mbi 5MB (5,242,880 bajt) me mesazhin: *"Madhësia e fotografisë tejkalon kufirin maksimal të lejuar prej 5MB."*
     * Konfigurimin `formatOptions`: format WebP me cilësi 82 (`options: { quality: 82 }`).
     * Konfigurimin `resizeOptions`: gjerësi maksimale 2560px me ruajtje proporcioni (`fit: 'inside', withoutEnlargement: true`).
     * Madhësi imazhesh automatike: `thumbnail` (400x300), `card` (768x1024), dhe `feature` (1920px).
   - `timeline-entries`: Pikat e renditura kronologjike të jetës dhe shërbimit.
4. **Globalet Kryesore**:
   - `memorial-profile`: Titulli i faqes, të dhënat biografike të të nderuarit dhe lidhjet e menysë kryesore.
   - `hero-settings`: Kryefaqja kryesore, animacioni i butë natyror dhe rrëfimi i veçuar.
   - `home-layout`: Renditja dinamike e seksioneve të kryefaqes dhe thënia përkujtimore.

5. **Skedar i dëmtuar**: nëse `data/cms-data.json` nuk është JSON i vlefshëm ose i mungon `locale:'sq'`/`site.navMenu`, `getCmsState` hedh `CmsStateCorruptError` (rrugët kthejnë 500), shkruan `cms-data.json.<ts>.corrupt.bak` dhe e lë skedarin të paprekur — nuk zëvendësohet më me përmbajtjen e paracaktuar. Vetëm skedari bosh/mungues inicializohet me default. Rikthimi: kopje rezervë ose fshirja manuale e skedarit. Test: `tests/corrupt-state.test.ts`.

6. **Shkrime të njëkohshme**: çdo rrugë mutacioni që lexon-ndryshon-shkruan gjendjen CMS eksportohet përmes `serialized(handler)` (`src/lib/payloadClient.ts`), që i vë në radhë kërkesat që të mos humbasë asnjë ndryshim. Rrugë të reja mutacioni duhet të përdorin të njëjtin mbështjellës. Vlen për një proces të vetëm. Test: `tests/concurrent-writes.test.ts`.

7. **Rruga e DB-së**: `payload.config.ts` përdor `resolveDatabaseUrl(process.env.DATABASE_URI)` (`src/lib/dataPaths.ts`): pa vlerë → `file:<DATA_DIR>/arkivi.db`; `file:./relative` zgjidhet kundrejt `APP_ROOT` (jo `process.cwd()`); URL absolute/të largëta kalojnë të pandryshuara. Backup lexon gjithmonë `DATA_DIR/arkivi.db`, ndaj `DATABASE_URI` absolute jashtë `DATA_DIR` nuk mbulohet nga backup. Test: `tests/database-url.test.ts`.

8. **Fusha të pastrueshme**: rrugët `PUT /api/hero`, `/api/site`, `/api/book/spreads` përdorin `mergeText` (`src/lib/sanitize.ts`): çelës mungues = ruhet vlera aktuale; varg bosh pastron vetëm fushat opsionale (kicker, nëntitull, foto hero, kushtim, shënim fundi, nëntitulli/kapaku i librit, etj.); fushat e detyrueshme (titujt, `headline`, emrat, CTA kryesore, `featuredStoryId`) nuk bëhen kurrë bosh. Test: `tests/clearable-fields.test.ts`.

## Ku Ndodhet Kodi
- Konfigurimi Kryesor: `src/payload.config.ts`
- Koleksionet: `src/collections/` (`Users.ts`, `Stories.ts`, `BookSpreads.ts`, `Media.ts`, `TimelineEntries.ts`)
- Globalet: `src/globals/` (`MemorialProfile.ts`, `HeroSettings.ts`, `HomeLayout.ts`)
- Lidhësi i të Dhënave & Zgjidhja e Shtigjeve: `src/lib/payloadClient.ts`
- Skedari i Gjendjes CMS: `data/cms-data.json`
- Skedari i Bazës SQLite: `data/arkivi.db`

## Çfarë Nuk Duhet të Bëhet
- Mos hiqni hook-un `beforeValidate` nga `src/collections/Media.ts`, pasi ai garanton se asnjë ngarkim mbi 5MB nuk mund të depërtojë në bazën e të dhënave të Payload.
- Mos fshini fusha nga skemat e Payload pa azhurnuar tipet në `src/types/cms.ts` dhe frontend-in përkatës.
- Mos ruani imazhe pa përcaktuar `aspectRatio` përkatës, pasi ai ndihmon në renditjen harmonike të galerisë mozaik.

## Verifikimi
```powershell
# Verifikimi i tipizimit Typescript
npm run lint

# Ekzekutimi i testeve të kufijve të Media dhe integritetit të bazës
npm test
```
