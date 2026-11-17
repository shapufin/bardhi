# 04 — Sistemi i Dizajnit, Tipografia & Rregullat Anti-Slop

## Çfarë Duhet të Jetë e Vërtetë (Invariants)

### Paleta Arkivore (Disiplina 60-30-10)
- **Sfondi Primar (60%)**: Letër Muzeale `#F7F4EC` (`--background`), Kartë Arkivore `#FCFBF7` (`--card`).
- **Sipërfaqet Strukturore (30%)**: Gëlqeror i ngrohtë `#EDE8DC` (`--secondary`), Vija Ndarëse `1px` `#DCD6C8` (`--border`), Bojë Qymyri `#171614` (`--foreground`), Gri e Ngrohtë `#635D55` (`--muted-foreground`).
- **Theksi Kuratorial (10%)**: E Gjelbër Qiparisi e Thellë `#1B3B2B` (`--primary`), Tunxh Arkivor `#C5A56D` (për detajet e kopertinës).

### Tipografia (Rregulli 2+1)
1. **Titujt & Proza Letrare**: `Cormorant Garamond` (ose `Source Serif 4`) me gjerësi leximi `65ch–75ch`, `text-wrap: balance`, dhe drop-cap arkivor (`.archival-drop-cap`).
2. **Ndërfaqja & Kontrollet**: `Plus Jakarta Sans` me madhësi të dukshme për të moshuarit (`15px–17px`) dhe kontrast të lartë.
3. **Numrat & Datat**: `JetBrains Mono` me `tabular-nums` të pandara me pilula, por me pika delikate `·`.

### Rregullat Anti-Slop
- [x] Pa gradientë lejla/blu SaaS ose karta me shkëlqim artificial.
- [x] Pa pilula zbukuruese rreth tekstit.
- [x] Ndarje me vija të holla `1px` dhe hapësirë të bollshme arkivore.
- [x] Pa tekst bosh ("Lorem Ipsum") apo të dhëna të fabrikuara; çdo rrëfim ka peshë emocionale dhe vërtetësi.

### Rregulla të zbatuara me test
- **Pa hex në komponentë (F-22)**: ngjyrat vijnë nga variablat CSS te `globals.css` (`--primary`, `--border`, `--brass`, `--book-*`); në klasa Tailwind përdoret `bg-[color:var(--book-paper)]` (me `color:` për `text-`/`border-`/`bg-`). Test: `tests/design-tokens.test.ts`.
- **Tekst i Studios ≥ 14px (F-23)**: asnjë `text-xs`/`text-[11px]` te `components/admin`; etiketat e fushave janë `text-base` (16px). Test: `tests/studio-text-size.test.ts`.

## Ku Ndodhet Kodi
- Variablat dhe Shenjat CSS: `src/app/(frontend)/globals.css` dhe `src/app/(payload)/custom.css`
- Komponentët Bazë UI: `src/components/ui/` (`button.tsx`, `card.tsx`, `dialog.tsx`, `switch.tsx`, `tabs.tsx`)

## Çfarë Nuk Duhet të Bëhet
- Mos fusni ngjyra të forta neon ose gradientë linearë SaaS.
- Mos përdorni ikona emoji në vend të ikonave profesionale `lucide-react`.

## Verifikimi
- Inspektoni pamjen në 1440px desktop dhe 375px celular me `CloakBrowser` për të siguruar kontrastin e lartë dhe mungesën e tejkalimit horizontal.
