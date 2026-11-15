import type { GlobalConfig } from 'payload';

export const HomeLayout: GlobalConfig = {
  slug: 'home-layout',
  label: 'Renditja e Seksioneve & Thënia',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'sections',
      type: 'array',
      label: 'Seksionet e Faqes Kryesore',
      fields: [
        {
          name: 'type',
          type: 'select',
          label: 'Lloji i Seksionit',
          options: [
            { label: 'Kryefaqja (Hero)', value: 'hero' },
            { label: 'Rrëfimi i Veçuar', value: 'featured-story' },
            { label: 'Lista e Rrëfimeve', value: 'stories-feed' },
            { label: 'Libri Fizik 3D', value: 'book-spotlight' },
            { label: 'Thënia Arkivore', value: 'quote-band' },
            { label: 'Galeria e Fotove (Mozaik)', value: 'masonry-gallery' },
            { label: 'Kronologjia e Jetës', value: 'timeline' },
          ],
          required: true,
        },
        {
          name: 'label',
          type: 'text',
          label: 'Emri i Brendshëm',
          required: true,
        },
        {
          name: 'heading',
          type: 'text',
          label: 'Titulli i Seksionit',
        },
        {
          name: 'subheading',
          type: 'text',
          label: 'Nëntitulli / Përshkrimi',
        },
        {
          name: 'enabled',
          type: 'checkbox',
          label: 'Aktiv (Shfaqet në Faqe)',
          defaultValue: true,
        },
        {
          name: 'storiesVariant',
          type: 'select',
          label: 'Pamja e Rrëfimeve (për Seksionin e Rrëfimeve)',
          defaultValue: 'editorial-grid',
          options: [
            { label: 'Kolona (Grid Editorial)', value: 'editorial-grid' },
            { label: 'Indeks (Listë Kronologjike)', value: 'chronicle-list' },
            { label: 'Mozaik (Kartat e Mëdha)', value: 'masonry' },
          ],
        },
      ],
    },
    {
      name: 'quoteBand',
      type: 'group',
      label: 'Thënia Arkivore në Qendër të Faqes',
      fields: [
        {
          name: 'quote',
          type: 'textarea',
          label: 'Thënia',
          defaultValue: 'Pikëllimi është thjesht dashuri që s’ka më ku të shkojë në ditët e zakonshme — ndaj i ndërtojmë një dhomë të qetë prej rrëfimesh, letre dhe drite.',
        },
        {
          name: 'attribution',
          type: 'text',
          label: 'Autori i Thënies / Burimi',
          defaultValue: 'Nga ditarët e familjes, vjeshtë 2024',
        },
      ],
    },
    {
      name: 'bookInfo',
      type: 'group',
      label: 'Të Dhënat e Librit në Kryefaqe',
      fields: [
        {
          name: 'bookTitle',
          type: 'text',
          label: 'Titulli i Librit',
          defaultValue: 'Letra për Rrugën e Veriut',
        },
        {
          name: 'bookSubtitle',
          type: 'text',
          label: 'Nëntitulli i Librit',
          defaultValue: 'Libër Kujtimesh në Faqe, Fotografi dhe Shënime Anësore',
        },
        {
          name: 'coverImage',
          type: 'upload',
          relationTo: 'media',
          label: 'Kopertina e Librit',
        },
      ],
    },
  ],
};
