# Raporti i Plotë i Auditimit (Round 1) · Arkivi Përkujtimor Dritan Berisha

- **Data**: 16 Nëntor 2026
- **Statusi i Repository**: Clean (`main`)
- **Fusha e Auditimit**: Backend (Studio Login Auth, API Media Deletion, PayloadCMS v3) dhe Frontend (Studio e Autorit — Albumi i Fotove, Dialogu i Konfirmimit).

---

## 1. Scorecard-i i Auditimit

| Ashpërsia | Gjetur në Fillim | Zgjidhur në Round 1 | Të Reja | Shkalla e Zgjidhjes |
|---|---|---|---|---|
| **CRITICAL** | 0 | 0 | 0 | **100%** |
| **HIGH** | 2 | 2 | 0 | **100%** |
| **MEDIUM** | 2 | 2 | 0 | **100%** |
| **LOW** | 0 | 0 | 0 | **100%** |
| **Totali** | **4** | **4** | **0** | **100%** |

---

## 2. Gjetjet e Zgjidhura & Detajet Teknike

### Batch A: Backend & Integriteti i të Dhënave
1. **[BE-HIGH-01] Studio Login Auth Bypass kur ekziston Payload Global Password**:
   - *Simptoma*: Commit-i `4a7f850` i marrë nga prodhimi ekzekutonte fallback-un në `STUDIO_PASSWORD` nga `.env` pa kusht sa herë që `ok` ishte `false`, duke anashkaluar fjalëkalimin e caktuar nga admini teknik dhe duke dështuar testin `tests/studio-auth.test.ts`.
   - *Zgjidhja*: Në `src/app/api/studio/login/route.ts`, fallback-u te `.env` lejohet VETËM nëse nuk është vendosur asnjë fjalëkalim në `studio-settings` (`!storedHash`).
   - *Verifikimi*: `tests/studio-auth.test.ts` kalon 11/11 teste (100%).

2. **[BE-HIGH-02] Bllokimi 409 i Fshirjes së Fotografive në `/api/media/[id]`**:
   - *Simptoma*: Fshirja e fotove bllokohej me HTTP 409 nëse fotografia ishte referencuar në hero, rrëfime apo faqe libri, duke mos lejuar autorin t'i fshijë fotot e padëshiruara.
   - *Zgjidhja*: Në `src/app/api/media/[id]/route.ts`, fshirja kryen shkëputje atomike të referencave (`heroImageId = ''`, `bookCoverImageId = ''`, pastron `coverImageId` dhe `galleryImageIds` te tregimet, dhe pastron `block.imageId` te faqet e librit) dhe fshin skedarin fizik nga disku në `/uploads/`.
   - *Verifikimi*: Testi i ri Tier 4 në `tests/upload.test.ts` vërteton heqjen e plotë të asetit dhe shkëputjen e të gjitha referencave.

### Batch B: Studio e Autorit — Albumi i Fotove & Përvoja e Përdoruesit
3. **[FE-MED-01] Mungesa e Butonit të Fshirjes për Fotot pa `isUpload`**:
   - *Simptoma*: Në `src/components/admin/MediaLibrary.tsx`, butoni i fshirjes kushtëzohej me `{item.isUpload && ...}`, duke bllokuar fshirjen e fotove ekzistuese, të importuara apo të ngarkuara më herët.
   - *Zgjidhja*: Butoni i fshirjes shfaqet për të gjitha fotot në album.

4. **[FE-MED-02] Mungesa e Dialogut të Konfirmimit para Fshirjes**:
   - *Simptoma*: Fshirja thirrej menjëherë pa dialog konfirmimi.
   - *Zgjidhja*: Shtuar dialog konfirmimi në shqip me paralajmërim të qartë, butonat "Anulo" dhe "Po, Fshij Fotografinë", dhe gjendje ngarkimi `isDeleting`.

---

## 3. Metrikat e Testimit & Kompilimit

- **Suita e Testeve**: 79/79 kaluan me sukses (0 dështime).
- **TypeScript**: `npm run lint` (`tsc --noEmit`): 0 gabime.
- **Kompilimi i Prodhimit**: `npm run build`: Kompiluar me sukses në të gjitha 16 rrugët.
