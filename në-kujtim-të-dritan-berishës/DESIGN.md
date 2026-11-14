# Arkitektura e Dizajnit & Blueprint Teknik për PayloadCMS v3 (`DESIGN.md`)

Ky dokument shërben si specifikim i plotë teknik dhe vizual për ndërtimin dhe zgjerimin e arkivit përkujtimor në **Next.js + PayloadCMS v3 + PostgreSQL/Express**. E gjithë ndërfaqja (Admin GUI & Frontend Publik) është projektuar posaçërisht në **gjuhën shqipe** dhe e thjeshtuar për një autor të moshuar.

---

## 1. Qëllimi i Produktit & Rrjedha e Përdoruesit

1. **Autori (Një Prind i Moshuar)**:
   - Përdor **`Studio e Autorit`** me panel anësor të qartë (`Ballina & Menyja`, `Rrëfimet`, `Ndërtuesi i Librit`, `Arkivi i Fotove`, `Shiko Faqen Live`).
   - Ndryshon **Titullin e Faqes** (`siteTitle`), fsheh/shfaq ose riemërton çdo lidhje të **Menysë Kryesore** (`navMenu`), aktivizon/çaktivizon **Animacionin e Ballinës**, dhe rendit seksionet e faqes kryesore me tërheqje (`@dnd-kit`).
   - Mund të redaktojë **drejtpërdrejt brenda Librit 3D** përmes butonit **`Redakto Librin`** pa u shkëputur nga faqet e librit.
2. **Lexuesit & Familjarët**:
   - Përjetojnë një arkiv përkujtimor me estetikë monografie muzeale (`#F7F4EC`, `#171614`, `#1B3B2B`), tre pamje të rrëfimeve (`Kolona`, `Indeks`, `Mozaik`), galeri arkivore, kronologji dhe **Librin Fizik 3D**.

---

## 2. Sistemi Vizual & Rregullat Anti-Slop

### Paleta e Ngjyrave (60-30-10)
- **Sfondi Kryesor (60%)**: Letër Muzeale `#F7F4EC` (`--background`), Kartë Arkivore `#FCFBF7` (`--card`).
- **Sipërfaqet Strukturore (30%)**: Gëlqeror i Ngrohtë `#EDE8DC` (`--secondary`), Vija Ndarëse `1px` `#DCD6C8` (`--border`), Bojës së Qymyrit `#171614` (`--foreground`), Gri e Ngrohtë `#635D55` (`--muted-foreground`).
- **Theksi Kuratorial (10%)**: E Gjelbër Qiparisi e Thellë `#1B3B2B` (`--primary`) dhe tunxh arkivor `#C5A56D` për detajet e kopertinës së librit.

### Tipografia (2+1)
- **Titujt & Proza Letrare**: `Cormorant Garamond` — tituj me `text-wrap: balance`, gjerësi optimale leximi `65ch–75ch`, dhe shkronjë e madhe fillestare (`.archival-drop-cap`).
- **Ndërfaqja & Studio e Autorit**: `Plus Jakarta Sans` — madhësi e rehatshme dhe kontrast i lartë.
- **Numrat e Faqeve & Datat**: `JetBrains Mono` me `tabular-nums`.

### Parimet e Pastërtisë Editoriale
- Pa kuti gjenerike të rrumbullakosura SaaS dhe pa pilula zbukuruese (`pills`).
- Ndarje me vija `1px` dhe hapësirë arkivore.
- Lëvizjet përdorin `transform` dhe `opacity`, respektojnë `prefers-reduced-motion`, dhe kanë çelës aktiv/joaktiv në Admin GUI.

---

## 3. Libri Fizik 3D (`@react-spring/web` + `framer-motion`) & Modaliteti Edit Direkt

Lexuesi i librit (`PhysicalBookReader`, `BookPageContent`, `BookInlineEditor`) simulon një libër me kapak të fortë duke kombinuar fizikën pranverore të **`@react-spring/web`** me tranzicionet e **`framer-motion`** brenda një skene CSS 3D (`perspective: 2400px`, `transform-style: preserve-3d`):

### Arkitektura 3D & Shtresat e Saktësuara (`translateZ`)
- **Mbështjellësi i Dyfishtë**: `coverSpring.shiftX` drejton zhvendosjen qendrore (`-25%` kur kapaku mbyllet, `0%` kur hapet), ndërsa `to([tiltX, tiltY, scale])` animon animin perspektivik kur lëvizet mausi në modalitetin **Pamje 3D** vs **Pamje Leximi**.
- **Hierarkia e Shtresave Z** (eliminon prerjen e fletëve dhe dridhjet):
  - Kapaku i pasëm me qoshe tunxhi dhe shirit mëndafshi: `translateZ(-16px)`
  - Shtresat anësore të trashësisë së fletëve (majtas/djathtas, dinamike sipas pozicionit): `translateZ(-8px)`
  - Faqet statike majtas dhe djathtas: `translateZ(0px)`
  - Hija e kurrizit qendror: `translateZ(1px)`
  - Hija dinamike e hedhur mbi faqen poshtë: `translateZ(2px)`
  - Fleta lëvizëse 3D me dy anë (`backface-visibility: hidden`, `staticSnapshot=true` pa scrollbars brenda shtresës 3D): `translateZ(5px)` me rrotullim `rotateY(0° ↔ -180°)`
  - Kapaku i përparmë 3D i stampuar me ar dhe foto kopertine: `rotateY(0° ↔ -180°) translateZ(14px)`
- **Sinkronizimi Atomik i Gjendjes**:
  - `ReaderNavState` mban në mënyrë atomike `{ spreadIndex, mobilePageIdx, turning }`, ndërsa `turnTokenRef` garanton që përfundimi (`onRest`) i një rrotullimi të ndërprerë të mos mbishkruajë kurrë fletën e re.
- **Përshtatja për Celular (`< 768px`)**:
  - Kalon automatikisht në modalitetin me një faqe të plotë 3D të shfletueshme me gisht (swipe majtas/djathtas) në mënyrë që teksti dhe fotografitë të jenë të mëdha e të pastra.
- **Modaliteti Edit Direkt brenda Librit (`BookInlineEditor`)**:
  - Nga shiriti i sipërm i librit, butoni **`Redakto Librin`** hap drejtpërdrejt dy faqet aktuale për redaktim: ndryshim të titullit/kapitullit, shkrim të drejtpërdrejtë të paragrafëve, ndezje të `Drop Cap`, zgjedhje fotografish nga Arkivi (`MediaPickerDialog`), shtim thëniesh e shënimesh, shtim/fshirje flete, dhe ruajtje të menjëhershme në `/api/book/spreads`.
- **Modaliteti `Lexim i Pastër`**:
  - Alternativë DOM me kontrast të lartë dhe animacion `AnimatePresence` për lexuesit që preferojnë lexim të sheshtë.

---

## 4. Specifikimi i Koleksioneve & Globaleve për PayloadCMS v3

Ky model të dhënash (`src/types/cms.ts` dhe `data/cms-data.json`) përkthehet 1:1 në **PayloadCMS v3 + Next.js App Router**:

### Koleksionet (`src/collections/`)
1. **`Stories` (`slug: 'stories'`)**:
   - `title` (`text`, required)
   - `subtitle` (`text`)
   - `eraLabel` (`text`) — p.sh. `Fëmijëria`, `Shërbimi`, `Kujtime Familjare`
   - `publishedDate` (`date`)
   - `readingMinutes` (`number`)
   - `coverImage` (`upload`, relationTo: `'media'`)
   - `galleryImages` (`upload`, hasMany: true, relationTo: `'media'`)
   - `body` (`richText` ose array paragrafësh)
   - `pullQuote` (`textarea`)
   - `status` (`select`: `draft | published`)
   - `featured` (`checkbox`)
2. **`BookSpreads` (`slug: 'book-spreads'`)**:
   - `sortOrder` (`number`)
   - `chapterLabel` (`text`)
   - `spreadTitle` (`text`)
   - `leftPageNumber`, `rightPageNumber` (`number`)
   - `leftBlocks` & `rightBlocks` (`blocks`: `prose` me `dropCap`, `photo` me `image` + `caption`, `quote`, `handwritten-note`)
3. **`Media` (`slug: 'media'`, `upload: true`)**:
   - `title`, `alt`, `caption`, `year`, `aspectRatio` (`3:4 | 4:3 | 1:1 | 16:9`)
4. **`TimelineEntries` (`slug: 'timeline-entries'`)**:
   - `sortOrder`, `year`, `title`, `description`

### Globalet (`src/globals/`)
1. **`MemorialProfile` (`slug: 'memorial-profile'`)**:
   - `siteTitle`, `honoreeName`, `yearsLabel`, `authorName`, `authorRelation`, `dedicationLine`, `footerNote`
   - `navMenu` (`array`): `{ id, target: 'home' | 'stories' | 'book' | 'gallery' | 'timeline', label, enabled }`
2. **`HeroSettings` (`slug: 'hero-settings'`)**:
   - `kicker`, `headline`, `subheadline`, `featuredStory` (`relationship` -> `stories`), `heroImage` (`upload`), `primaryCtaLabel`, `secondaryCtaLabel`
   - `animationEnabled` (`checkbox`), `animationStyle` (`gentle-drift | soft-fade | none`)
3. **`HomeLayout` (`slug: 'home-layout'`)**:
   - `sections` (`array` i renditshëm): `{ id, type, label, enabled, heading, subheading, storiesVariant: 'editorial-grid' | 'chronicle-list' | 'masonry' }`
   - `quoteBand`: `{ quote, attribution }`

---

## 5. Kontrata API & Konfigurimi i Serverit (`App Building Ready`)

### Pikat e Fundit (`server.ts` -> Payload Route Handlers)
- `GET /api/cms` — Kthen gjendjen e plotë arkivore (`locale: "sq"`)
- `PUT /api/site` — Përditëson titullin e faqes, të dhënat e kushtimit dhe nyjet e menysë (`navMenu`)
- `PUT /api/hero` — Përditëson ballinën, rrëfimin kryesor dhe animacionin
- `PUT /api/layout` — Përditëson renditjen e seksioneve, pamjen e rrëfimeve dhe thënien
- `POST /api/stories` & `DELETE /api/stories/:id` — Krijon, përditëson, publikon ose fshin rrëfime
- `PUT /api/book/spreads` — Ruan titullin e librit, kopertinën dhe fletët dyshe (përfshirë ruajtjen nga Modaliteti Edit Direkt në libër)
- `POST /api/media`, `PUT /api/media/:id`, `DELETE /api/media/:id` — Ngarkon foto në `data/uploads/` dhe menaxhon arkivin
- `PUT /api/timeline` — Përditëson kronologjinë e jetës

### Lidhja me PayloadCMS v3 (`payload.config.ts`)
```ts
export default buildConfig({
  localization: {
    locales: ['sq'],
    defaultLocale: 'sq',
  },
  admin: {
    components: {
      views: {
        dashboard: {
          Component: '@/components/admin/AdminStudio#AdminStudio',
        },
      },
    },
    livePreview: {
      url: () => `${process.env.NEXT_PUBLIC_SERVER_URL}/?preview=true`,
      collections: ['stories', 'book-spreads'],
      globals: ['memorial-profile', 'hero-settings', 'home-layout'],
    },
  },
});
```

### Lista e Kontrollit para Prodhimit
1. **Runtime**: Serveri Express lidh `http.createServer(app)` me Vite (`ws: false` dhe `hmr: false` kur `DISABLE_HMR=true`), dhe në prodhim (`npm run build && npm start`) shërben `dist/`.
2. **Ruajtja**: Në PayloadCMS v3, lidhni `@payloadcms/db-postgres` dhe ruajtjen e skedarëve (S3/R2 ose disk lokal `media/`) për fotografitë familjare.
3. **Siguria & Autentifikimi**: Shtoni koleksionin `Users` me hyrje të thjeshtuar (fjalëkalim ose magic-link) për autorin e moshuar, ndërsa leximi publik mbetet i hapur.
