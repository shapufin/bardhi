# Graph Report - BARDHI  (2026-11-14)

## Corpus Check
- Large corpus: 153 files · ~676,450 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 664 nodes · 1796 edges · 20 communities (19 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 1,200 input · 450 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18

## God Nodes (most connected - your core abstractions)
1. `Button` - 37 edges
2. `Button` - 33 edges
3. `cn()` - 32 edges
4. `cn()` - 32 edges
5. `ArchivalImage()` - 29 edges
6. `ArchivalImage()` - 29 edges
7. `MediaAsset` - 25 edges
8. `getCmsState()` - 24 edges
9. `saveCmsState()` - 24 edges
10. `MediaAsset` - 24 edges

## Surprising Connections (you probably didn't know these)
- `MemorialWorkspace()` --calls--> `PublicSite()`  [EXTRACTED]
  arkivi-app/src/app/(frontend)/page.tsx → arkivi-app/src/components/frontend/PublicSite.tsx
- `StudioPage()` --calls--> `AdminStudioWrapper()`  [EXTRACTED]
  arkivi-app/src/app/(frontend)/studio/page.tsx → arkivi-app/src/components/admin/AdminStudioWrapper.tsx
- `POST()` --calls--> `saveCmsState()`  [EXTRACTED]
  arkivi-app/src/app/api/cms/reset/route.ts → arkivi-app/src/lib/payloadClient.ts
- `GET()` --calls--> `getCmsState()`  [EXTRACTED]
  arkivi-app/src/app/api/cms/route.ts → arkivi-app/src/lib/payloadClient.ts
- `SortableBlockCard()` --calls--> `ArchivalImage()`  [EXTRACTED]
  arkivi-app/src/components/admin/BookBuilder.tsx → arkivi-app/src/components/ArchivalImage.tsx

## Import Cycles
- None detected.

## Communities (20 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (58): MemorialWorkspace(), Page(), metadata, StudioPage(), AdminStudio(), AdminStudioProps, StudioSection, AdminStudioWrapper() (+50 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (45): PUT(), POST(), GET(), PUT(), PUT(), DELETE(), PUT(), UPLOADS_DIR (+37 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (56): AdminStudio(), AdminStudioProps, StudioSection, BookBuilder(), PageColumnEditor(), SortableBlockCard(), SortableSpreadTile(), HomeHeroEditor() (+48 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (54): DATA_DIR, DATA_FILE, DEFAULT_CMS_STATE, __dirname, ensureStorage(), __filename, readCms(), startServer() (+46 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (47): ArchivalImage(), ArchivalImageProps, BookInlineEditorProps, BookPageContent(), BookPageContentProps, BookSpotlightSection(), BookSpotlightSectionProps, FeaturedStorySection() (+39 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (36): class-variance-authority, clsx, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, dotenv, framer-motion, lucide-react (+28 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (36): class-variance-authority, clsx, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, dotenv, framer-motion, lucide-react (+28 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (31): Auth, BookSpread, BookSpreadsSelect, CollectionsWidget, Config, GeneratedTypes, HeroSetting, HeroSettingsSelect (+23 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (30): dependencies, class-variance-authority, clsx, cross-env, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, dotenv (+22 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (28): dependencies, class-variance-authority, clsx, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, dotenv, express (+20 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (12): nextConfig, importMap, Args, Args, DELETE, GET, OPTIONS, PATCH (+4 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.24
Nodes (10): Archival Design System 60-30-10, Modeli i Qasjes (Author vs Superadmin), Modaliteti Edit Direkt në Libër, Baza e të Dhënave SQLite (arkivi.db), Arkivi i Fotografive Familjare, PayloadCMS v3 Next.js Integration, Libri Fizik 3D & React-Spring, Menaxhimi i Rrëfimeve & Kujtimeve (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (10): devDependencies, autoprefixer, esbuild, tailwindcss, tsx, @types/express, @types/node, @types/react (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (9): devDependencies, postcss, tailwindcss, @tailwindcss/postcss, tsx, @types/node, @types/react, @types/react-dom (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, preview, start

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, seed, start

### Community 18 - "Community 18"
Cohesion: 0.40
Nodes (3): @tailwindcss/vite, vite, @vitejs/plugin-react

## Knowledge Gaps
- **69 isolated node(s):** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@payloadcms/ui`, `@radix-ui/react-dialog` (+64 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 300 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `Community 3` to `Community 6`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **What connects `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` to the rest of the system?**
  _69 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08620689655172414 - nodes in this community are weakly interconnected._
- **Why does `payload` connect `Community 1` to `Community 10`, `Community 5`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05411392405063291 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Community 8` to `Community 5`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11139240506329114 - nodes in this community are weakly interconnected._