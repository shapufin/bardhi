# 02 — Studio e Autorit (Ndërfaqja Administrative e Thjeshtuar)

## Çfarë Duhet të Jetë e Vërtetë (Invariants)
1. **Dizajn i Përshtatur për Autorin e Moshuar**: Ndërfaqja është projektuar posaçërisht për një prind të moshuar (një baba që shkruan për djalin e tij të rënë). Nuk kërkon fjalëkalim për hyrje te `/studio` dhe shmang çdo zhargon teknik.
2. **Tipografi dhe Ndërveprim i Qartë**: Madhësia e tekstit për etiketat dhe butonat është gjithmonë e rehatshme (`16px+`), me kontrast të lartë dhe ikona të mëdha `lucide-react`.
3. **Struktura me 6 Hapësira Kryesore**:
   - **Kryefaqja & Menyja** (`home`): Titulli i faqes, kushtimi, aktivizimi/çaktivizimi i nyjeve të menysë, dhe renditja e seksioneve të kryefaqes me Drag & Drop (`@dnd-kit`).
   - **Rrëfimet** (`stories`): Menaxhimi i kujtimeve me kapak, drop-cap, periudhë kohore dhe status (publikuar/draft).
   - **Ndërtuesi i Librit** (`book`): Ndërtimi i fletëve dyshe me tërheqje të blloqeve majtas/djathtas.
   - **Albumi i Fotove** (`media`): Ngarkimi dhe menaxhimi i fotografive me përcaktim të raportit të pamjes (`3:4`, `4:3`, `16:9`, `1:1`), kontroll paraprak (≤ 5MB), dhe fshirje e plotë me dialog konfirmimi në shqip dhe shkëputje automatike të referencave që asnjë foto të mos mbetet e bllokuar.
   - **Përdoruesit & Siguria** (`users`): Pasqyra e llogarisë së autorit dhe administratorit teknik, krijimi i përdoruesve të rinj dhe lidhja direkte me panelin teknik PayloadCMS.
   - **Rezervim & Rivendosje** (`backup`): Paneli administrativ me `BackupManager.tsx` (ikona `HardDrive`) që lejon shkarkimin e menjëhershëm të kopjes rezervë ZIP dhe ngarkimin/ekzekutimin e rivendosjes me konfirmim të qartë dhe njoftime progresi.
4. **Pamje e Drejtpërdrejtë**: Butoni "Pamje e Drejtpërdrejtë" hap dialogun e testimit në ekran të plotë për pamjen desktop dhe celular pa dalë nga studioja.

## Ku Ndodhet Kodi
- Komponenti Kryesor i Studios: `src/components/admin/AdminStudio.tsx`
- Mbështjellësi i Studio-s: `src/components/admin/AdminStudioWrapper.tsx`
- Redaktori i Kryefaqes & Renditjes: `src/components/admin/HomeHeroEditor.tsx`
- Menaxhuesi i Rrëfimeve: `src/components/admin/StoryManager.tsx`
- Ndërtuesi i Librit: `src/components/admin/BookBuilder.tsx`
- Galeria e Ngarkimit & Kufijtë e Fotografive: `src/components/admin/MediaLibrary.tsx`
- Menaxhuesi i Përdoruesve: `src/components/admin/UserManager.tsx`
- Paneli i Rezervimit & Rivendosjes: `src/components/admin/BackupManager.tsx`

## Çfarë Nuk Duhet të Bëhet
- Mos e ngarkoni autorin me fusha teknike si "Slug", "SEO Metadata", "RegEx", apo "API Keys".
- Mos përdorni dritare konfirmimi me zhargon teknik; çdo veprim duhet të ketë etiketë të qartë si "Ruaj Titullin", "Publiko Rrëfimin", "Fshij Kujtimin", "Shkarko Kopjen Rezervë", "Rikthe të Dhënat".
- Mos lejoni ngarkimin e skedarëve më të mëdhenj se 5MB pa paralajmëruar menjëherë autorin në ekran me njoftim shqip.

## Verifikimi
- Hapni në shfletues: `http://localhost:3001/studio`
- Provoni kalimin midis **të 6 tabeve** (përfshirë "Rezervim & Rivendosje").
- Provoni klikimin e butonit "Shkarko Kopjen Rezervë" për të parë shkarkimin e ZIP-it.
- Provoni zgjedhjen e një imazhi > 5MB në tab-in "Albumi i Fotove" për të verifikuar shfaqjen e njoftimit toast bllokues.
