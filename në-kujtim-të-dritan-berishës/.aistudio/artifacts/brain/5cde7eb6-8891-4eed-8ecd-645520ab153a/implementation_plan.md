# Memorial Archive & Simplified Author Studio

A respectful, modern editorial memorial blog and interactive two-page book reader built for an older father to share stories, photographs, and a handwritten-style memoir of his son lost in war, paired with an accessible, simplified PayloadCMS-inspired Admin Studio and full technical blueprint (`DESIGN.md`).

### User Review & Critical Decisions

> [!IMPORTANT]
> All core product directions were confirmed during clarification. Review the finalized choices below before proceeding to implementation.

- **Confirmed Decision 1 — Visual Aesthetic**: Warm archival editorial palette with high-legibility serif typography, dignified negative space, and calm curatorial framing.
- **Confirmed Decision 2 — Persistence Strategy**: Express backend server providing REST API endpoints backed by local JSON CMS persistence (`cms-data.json`) and media storage, giving real multi-session saves without external database setup.
- **Confirmed Decision 3 — Book Reader & Builder**: Interactive two-page folio spread reader on the public site paired with a visual drag-and-drop spread and block builder in the Admin Studio.
- **Confirmed Decision 4 — Senior-Friendly Admin Layout**: Simplified large-text studio organized into clear, plain-language workspaces with a one-click Live Preview toggle so the author never navigates complex developer panels.

---

### 1. Overview & Core Concept

- **What It Does**: Delivers two tightly connected experiences inside one unified application:
  1. **Public Memorial Frontend**: A serene, mobile-responsive editorial site featuring a configurable Hero Banner (with toggleable subtle motion), multi-format story sections (Editorial Grid, Chronicle List, Masonry Photo Gallery), a long-form Story Reader, and an interactive Two-Page Book Reader.
  2. **Simplified Author Studio (Admin GUI)**: A rebuilt, senior-friendly PayloadCMS-inspired workspace focused strictly on writing stories, uploading/selecting photographs, composing visual book pages via drag-and-drop, toggling hero animations, and customizing homepage section order and visibility.
  3. **PayloadCMS Technical Blueprint (`DESIGN.md`)**: Detailed documentation mapping every collection, block schema, custom admin view, and live-preview contract for downstream PayloadCMS v3 development.
- **Target Audience / Persona**:
  - **Primary Author**: An older father with limited technical familiarity who needs large, unmistakable buttons, plain everyday labels, distraction-free writing, and immediate visual reassurance that his memories are saved.
  - **Readers & Family Visitors**: Friends, relatives, and community members reading stories and turning through the son's book across desktop and mobile devices.
- **Key Value**: Replaces overwhelming CMS tables and nested developer settings with a calm, visual publishing studio while maintaining structured, modular block data underneath.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Visitor Reading Flow**: Lands on the Hero Banner (featuring the son's portrait, tribute headline, and optional gentle ambient motion) → Scrolls through dynamically arranged sections (Featured Story, Stories in Grid or List layout, Masonry Memory Gallery, Dedication Quote) → Clicks any story to open the long-form Story Reader with generous typography and photo plates, or opens **His Book** to turn through two-page spreads with smooth transitions and adjustable text size.
  2. **Author Publishing Flow (Admin Studio)**: Clicks **Author Studio** → Sees four clear tabs (`Home & Hero`, `Stories`, `Book Builder`, `Photo Library`) → Edits the Hero headline or toggles Hero Animation On/Off → Writes or edits a story and picks its layout → Opens the Book Builder to drag-and-drop spreads into order and drag text/photo/quote blocks onto Left or Right book pages → Clicks **Preview Public Site** to verify changes immediately.
  3. **Dynamic Layout Customization**: Inside `Home & Hero`, the author drags homepage sections (Hero, Stories Feed, Photo Masonry, Book Spotlight, Tribute Quote) into any sequence, switches the Stories Feed style between Grid, List, or Masonry, or hides any section with a single toggle.

- **Visual Identity & Theme**:
  - **Aesthetic Direction**: Museum-grade Warm Archival Editorial — serene, respectful, and unhurried, avoiding generic AI templates, loud colors, or cluttered chrome.
  - **Color Palette & Mood (60-30-10 Discipline)**:
    - *Canvas (60%)*: Archival Alabaster (`#F9F7F2`) for public reading comfort; clean Warm White (`#FCFBF8`) inside the Admin Studio.
    - *Structural Surfaces (30%)*: Warm Limestone (`#EDE8DF`), hairline borders (`#DDD6C8`), Antique Charcoal primary ink (`#1C1917`), and muted stone secondary text (`#6B655E`).
    - *Accent (10%)*: Deep Lapis Ink (`#1E3A5F`) for primary actions, active editorial states, and focus rings, paired with quiet semantic indicators (Forest `#166534` for Published/Saved, Amber `#92400E` for Draft).
  - **Typography & Hierarchy (2+1 Rule)**:
    - *Editorial Display & Long-Form Prose*: `Source Serif 4` — refined optical sizing for memorial headlines (`clamp(2.25rem, 4vw, 3.75rem)` with `text-wrap: balance`), story titles, and book pages (`65ch–75ch` reading measure, `1.75` line height, classic initial drop caps).
    - *UI Controls & Senior-Friendly Admin*: `Plus Jakarta Sans` — crisp, open counters at `15px–17px` in the Admin Studio so labels and buttons are effortless to read.
    - *Folio & Archive Metadata*: `JetBrains Mono` with `tabular-nums` strictly for page numbers, dates, and index numbers (`01`, `Pages 03–04`), rendered as unboxed inline text separated by `·` (zero pill clutter).
  - **Component Styling & Layout**:
    - Clean 3-zone Top Bar (`Site Title` — `4–5 single-line links` — `Primary Action`).
    - Single-elevation surfaces separated by generous whitespace (`2rem–3rem`) and `1px` hairline borders rather than heavy shadows or nested cards.
    - Built with `shadcn/ui` primitives (Buttons, Tabs, Switch, Dialog, Sheet, Select, Input, Textarea, Slider, Sonner toasts) styled to match the archival token system.

- **Interactive Feedback & Motion**:
  - Powered by `motion` (`motion/react`) using compositor-only transforms (`opacity`, `transform`) settling within `180ms–320ms` (`cubic-bezier(0.16, 1, 0.3, 1)`), with full `prefers-reduced-motion` support.
  - **Hero Animation Toggle**: Admin Studio provides an explicit toggle (`On / Off`) and motion style selector (`Gentle Drift`, `Soft Fade`, `Static`) that immediately controls whether the hero portrait and typography animate on the public site.
  - **Book Spread Transitions**: Fluid cross-fade and subtle lateral page turn when advancing spreads, collapsing gracefully into stacked vertical folios on mobile screens.
  - **Save States**: Immediate optimistic UI feedback + real Express API save indicator (`"Saved just now"`) and toast confirmation via `sonner`.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Unified Express + React Workspace with Local JSON Store**
  - *Chosen Approach*: Run an Express server that serves both the Vite/React frontend on port 3000 and REST endpoints (`/api/cms`, `/api/stories`, `/api/book`, `/api/media`) persisting to a structured local JSON file.
  - *Why*: Delivers true persistent CMS behavior across browser refreshes without requiring database credentials, while keeping the JSON document shapes isomorphic to PayloadCMS Collections and Globals.
  - *Alternatives Considered*: Browser-only `localStorage` (loses edits across devices/sessions) or external database setup (adds friction before the user hands off to PayloadCMS).

- **Decision 2: Block-Based Book Spreads with Accessible Drag-and-Drop**
  - *Chosen Approach*: Model each book entry as a two-page spread (`leftPage`, `rightPage`), where each page holds an ordered array of visual blocks (`prose`, `photo`, `quote`, `dedication`) sortable via `@dnd-kit/sortable` plus accessible Up/Down fallback buttons.
  - *Why*: Drag-and-drop feels tactile and intuitive ("writing by hand on the web"), while arrow fallback buttons guarantee an older author using a trackpad or touch screen can never get stuck.
  - *Alternatives Considered*: Freeform absolute X/Y canvas positioning (breaks mobile responsiveness and overwhelms non-technical editors).

- **Decision 3: Simplified 4-Tab Senior Studio Over Full Generic CMS**
  - *Chosen Approach*: Surface only `Home & Hero`, `Stories`, `Book Builder`, and `Photo Library`, using 16px+ form controls, explicit `"Save Changes"` / `"Publish Story"` labels, and a toggleable `"Live Preview"` sheet/split mode.
  - *Why*: Directly fulfills the goal of rebuilding the PayloadCMS admin panel around drafting and publishing for an older individual.
  - *Alternatives Considered*: Generic multi-collection sidebar with raw JSON/slug/API fields (too intimidating for the target author).

- **Decision 4: Curated Memorial Imagery + Real Upload Support**
  - *Chosen Approach*: Generate bespoke, respectful archival photography assets upfront via `generate_image` for default seed stories, hero portrait, and book plates, AND support real local image uploads (via Express endpoint saving data/assets safely) in the Photo Library.
  - *Why*: Ensures zero broken external URLs out of the box while allowing the father to add his own real family photographs immediately.

---

### 4. Technical Architecture & Data Strategy

- **Architecture & Component Diagram**:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                   EXPRESS SERVER (Port 3000 + REST API)                   │
│  GET /api/cms  │  PUT /api/hero  │  PUT /api/layout  │  POST /api/media   │
│  CRUD /api/stories  │  PUT /api/book/spreads                              │
└───────────────────────────────┬───────────────────────────────────────────┘
                                │ reads / persists
                                ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                 LOCAL JSON CMS STORE (Payload-Isomorphic)                 │
│  SiteConfig · HeroSettings · PageSections[] · Stories[] · BookSpreads[]   │
└───────────────────────────────┬───────────────────────────────────────────┘
                                │ hydrates React Context + Live Preview
          ┌─────────────────────┴─────────────────────┐
          ▼                                           ▼
┌─────────────────────────────────┐ ┌───────────────────────────────────────┐
│    PUBLIC MEMORIAL FRONTEND     │ │   SIMPLIFIED SENIOR ADMIN STUDIO      │
│  ┌───────────────────────────┐  │ │  ┌─────────────────────────────────┐  │
│  │ Clean 3-Zone Header       │  │ │  │ Large-Text 4-Tab Navigation     │  │
│  └───────────────────────────┘  │ │  └─────────────────────────────────┘  │
│  ┌───────────────────────────┐  │ │  ┌──────────────┐ ┌────────────────┐  │
│  │ Dynamic Hero Banner       │  │ │  │ Home & Hero  │ │ Story Composer │  │
│  │ (Toggleable Motion)       │  │ │  │ Layout Order │ │ Grid/List/Post │  │
│  └───────────────────────────┘  │ │  └──────────────┘ └────────────────┘  │
│  ┌───────────────────────────┐  │ │  ┌──────────────┐ ┌────────────────┐  │
│  │ Dynamic Section Renderer  │  │ │  │ Book Spread  │ │ Photo Library  │  │
│  │ · Stories (Grid/List/Mas.)│  │ │  │ DnD Builder  │ │ Upload & Pick  │  │
│  │ · Masonry Memory Gallery  │  │ │  └──────────────┘ └────────────────┘  │
│  │ · Life Timeline & Quotes  │  │ │  ┌─────────────────────────────────┐  │
│  └───────────────────────────┘  │ │  │ Live Preview Toggle Overlay     │  │
│  ┌───────────────────────────┐  │ │  └─────────────────────────────────┘  │
│  │ Interactive Book Reader   │  │ └───────────────────────────────────────┘
│  │ (2-Page Spread + Lightbox)│  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

- **Data Model & State**:
  - **`SiteConfig`**: Memorial subject name, birth/passing years, short biography, dedication footer note.
  - **`HeroSettings`**: Title, subtitle, featured story ID, hero image reference, `animationEnabled` boolean, and `animationStyle` (`gentle-drift` | `soft-fade` | `none`).
  - **`PageSection[]`**: Ordered homepage blocks (`hero`, `featured-story`, `stories-feed`, `masonry-gallery`, `book-spotlight`, `quote-band`, `timeline`), each with `enabled` toggle, section heading, and layout variant (`grid`, `list`, `masonry`).
  - **`Story[]`**: ID, title, subtitle/excerpt, date/era, reading time, cover image, body paragraphs, gallery images, status (`published` | `draft`), and featured flag.
  - **`BookSpread[]`**: Ordered array of spreads; each spread has `id`, `chapterLabel`, `spreadTitle`, `leftBlocks[]`, and `rightBlocks[]`. Each block has `id`, `type` (`prose` | `photo` | `quote` | `handwritten-note`), text content, image reference, and caption.
  - **`MediaAsset[]`**: ID, title, alt text, caption, year/context, and image URL (seeded archival plates + user-uploaded photos).

- **Interactive Component & State Mapping**:
  - **Admin `Home & Hero` Panel**: Updates hero fields and section order/visibility via `@dnd-kit/sortable` + switches; dispatches `PUT` requests to Express, updating shared CMS context and persisting to JSON immediately.
  - **Admin `Stories` Composer**: Lists stories with Draft/Published filters; opens distraction-free editor with large controls, photo picker modal, and live save/publish handlers.
  - **Admin `Book Builder`**: Top rail drags spreads to reorder chapters/pages; split left/right folio editor lets the author add blocks (`+ Add Paragraph`, `+ Add Photo`, `+ Add Quote`), drag blocks within or between pages, edit text inline, and pick photos from the Photo Library.
  - **Live Preview Toggle**: Available inside the Admin Studio top bar; opens a responsive Desktop/Mobile preview drawer rendering the real Public Frontend components directly from current unsaved or saved studio state.
  - **Public `BookReader` & `GalleryLightbox`**: Keyboard-accessible (`ArrowLeft`/`ArrowRight`/`Escape`) spread pagination, adjustable reader font size, and full-screen photograph inspection with caption and year metadata.

- **PayloadCMS v3 Handoff (`DESIGN.md`)**:
  - Documents exact PayloadCMS v3 `buildConfig` architecture: Collection definitions (`Stories`, `BookSpreads`, `Media`), Globals (`MemorialProfile`, `HomeLayout`), Custom Root Dashboard (`components.views.dashboard`) replacing Payload's default collection grid with the 4-tab Senior Studio, and `@payloadcms/live-preview` `postMessage` synchronization rules.
