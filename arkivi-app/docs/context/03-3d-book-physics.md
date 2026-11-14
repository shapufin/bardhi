# 03 — Fizika e Librit 3D & Modaliteti Edit Direkt

## Çfarë Duhet të Jetë e Vërtetë (Invariants)
1. Libri simulon një botim fizik me kapak të trashë pëlhure/lini duke kombinuar fizikën pranverore të `@react-spring/web` me tranzicionet e `framer-motion` / `motion`.
2. Skena 3D përdor `perspective: 2400px` dhe `transform-style: preserve-3d`.
3. **Hierarkia e Shtresave Z (`translateZ`)**:
   - Kapaku i pasëm me qoshe tunxhi: `translateZ(-16px)`
   - Trashësia dinamike e fletëve (majtas/djathtas): `translateZ(-8px)`
   - Faqet statike majtas dhe djathtas: `translateZ(0px)`
   - Hija e kurrizit qendror: `translateZ(1px)`
   - Hija dinamike e hedhur mbi faqen poshtë: `translateZ(2px)`
   - Fleta lëvizëse 3D me dy anë (`backface-visibility: hidden`): `translateZ(5px)` me rrotullim `rotateY(0° ↔ -180°)`
   - Kapaku i përparmë 3D me stampim ari: `rotateY(0° ↔ -180°) translateZ(14px)`
4. **Modaliteti Edit Direkt brenda Librit (`BookInlineEditor`)**:
   - Butoni "Redakto Librin" në shiritin e sipërm të librit hap modalitetin e redaktimit drejtpërdrejt mbi dy faqet aktuale, duke lejuar autorin të ndryshojë tekstin, të zgjedhë foto nga arkivi dhe të ruajë në sekondë pa lëvizur nga faqja.
5. **Përshtatja për Celular (< 768px)**:
   - Kalon automatikisht në modalitet me një faqe të vetme me shfletim me gisht (swipe majtas/djathtas) pa scrollbars horizontale.

## Ku Ndodhet Kodi
- Lexuesi Kryesor 3D: `src/components/frontend/PhysicalBookReader.tsx`
- Redaktori i Integruar: `src/components/frontend/BookInlineEditor.tsx`
- Përmbajtja Tipografike e Faqeve: `src/components/frontend/BookPageContent.tsx`

## Çfarë Nuk Duhet të Bëhet
- Mos ndryshoni hierarkinë `translateZ` pa testuar rrotullimin në shfletues, pasi ndryshimet e pakujdesshme shkaktojnë "z-fighting" (prerje dhe dridhje të fletëve).
- Mos lejoni shfaqjen e scrollbar-eve brenda fletës lëvizëse 3D gjatë animacionit (`staticSnapshot=true`).

## Verifikimi
- Hapni `http://localhost:3001/` dhe klikoni "Hap Librin".
- Klikoni "Përpara" dhe "Mbrapa" për të vëzhguar lëvizjen e qetë të fletëve.
- Klikoni "Redakto Librin" dhe provoni të ndryshoni një titull.
