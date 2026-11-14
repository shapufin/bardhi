# 02 — Studio e Autorit (Ndërfaqja Administrative e Thjeshtuar)

## Çfarë Duhet të Jetë e Vërtetë (Invariants)
1. Ndërfaqja është projektuar posaçërisht për një autor të moshuar (një baba që shkruan për djalin e tij të rënë).
2. Madhësia e tekstit për etiketat dhe butonat është gjithmonë e rehatshme (`16px+`), me kontrast të lartë dhe ikona të mëdha `lucide-react`.
3. Paneli anësor përmban 5 hapësira kryesore:
   - **Ballina & Menyja**: Titulli i faqes, kushtimi, aktivizimi/çaktivizimi i nyjeve të menysë, dhe renditja e seksioneve të ballinës me Drag & Drop (`@dnd-kit`).
   - **Rrëfimet**: Menaxhimi i kujtimeve me kapak, drop-cap, periudhë kohore dhe status (publikuar/draft).
   - **Ndërtuesi i Librit**: Ndërtimi i fletëve dyshe me tërheqje të blloqeve majtas/djathtas.
   - **Albumi i Fotove**: Ngarkimi i drejtpërdrejtë i fotografive nga kompjuteri me përcaktim të raportit të pamjes (`3:4`, `4:3`, `16:9`, `1:1`).
   - **Përdoruesit & Siguria**: Pasqyra e llogarisë së autorit dhe administratorit teknik, krijimi i përdoruesve të rinj dhe lidhja direkte me panelin teknik PayloadCMS.
4. Butoni "Pamje e Drejtpërdrejtë" hap dialogun e testimit në ekran të plotë për pamjen desktop dhe celular pa dalë nga studioja.

## Ku Ndodhet Kodi
- Komponenti Kryesor: `src/components/admin/AdminStudio.tsx`
- Mbështjellësi i Studio-s: `src/components/admin/AdminStudioWrapper.tsx`
- Redaktori i Ballinës & Renditjes: `src/components/admin/HomeHeroEditor.tsx`
- Menaxhuesi i Rrëfimeve: `src/components/admin/StoryManager.tsx`
- Ndërtuesi i Librit: `src/components/admin/BookBuilder.tsx`
- Galeria e Ngarkimit: `src/components/admin/MediaLibrary.tsx`
- Menaxhuesi i Përdoruesve: `src/components/admin/UserManager.tsx`

## Çfarë Nuk Duhet të Bëhet
- Mos e ngarkoni autorin me fusha teknike si "Slug", "SEO Metadata", "RegEx", apo "API Keys".
- Mos përdorni dritare konfirmimi me zhargon teknik; çdo veprim duhet të ketë etiketë të qartë si "Ruaj Titullin", "Publiko Rrëfimin", "Fshij Kujtimin".

## Verifikimi
- Hapni në shfletues: `http://localhost:3001/studio`
- Provoni kalimin midis 5 tabeve dhe ruajtjen e një ndryshimi.
