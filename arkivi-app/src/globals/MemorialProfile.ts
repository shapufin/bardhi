import type { GlobalConfig } from 'payload';

export const MemorialProfile: GlobalConfig = {
  slug: 'memorial-profile',
  label: 'Profili Përkujtimor & Menyja',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'siteTitle',
      type: 'text',
      label: 'Titulli i Faqes (shfaqet lart)',
      required: true,
      defaultValue: 'Arkivi i Dritan Berishës',
    },
    {
      name: 'honoreeName',
      type: 'text',
      label: 'Emri i të Nderuarit',
      required: true,
      defaultValue: 'Dritan Berisha',
    },
    {
      name: 'yearsLabel',
      type: 'text',
      label: 'Vitet (Lindja — Rënia)',
      defaultValue: '1998 — 2024',
    },
    {
      name: 'authorName',
      type: 'text',
      label: 'Emri i Autorit (Babai)',
      defaultValue: 'Ilir Berisha',
    },
    {
      name: 'authorRelation',
      type: 'text',
      label: 'Lidhja Familjare',
      defaultValue: 'Mbledhur dhe shkruar nga i ati',
    },
    {
      name: 'dedicationLine',
      type: 'textarea',
      label: 'Fjalia e Kushtimit',
      defaultValue: 'Për çdo mëngjes pranë dritares dhe për çdo letër të dërguar në shtëpi.',
    },
    {
      name: 'footerNote',
      type: 'textarea',
      label: 'Shënimi në Fund të Faqes',
      defaultValue: 'Ruajtur me dashuri nga familja Berisha. Çdo rrëfim dhe fotografi mbetet dëshmi e gjallë e jetës së tij.',
    },
    {
      name: 'navMenu',
      type: 'array',
      label: 'Lidhjet e Menysë Kryesore',
      fields: [
        {
          name: 'target',
          type: 'select',
          label: 'Seksioni i Synuar',
          options: [
            { label: 'Ballina', value: 'home' },
            { label: 'Rrëfimet', value: 'stories' },
            { label: 'Libri i Tij', value: 'book' },
            { label: 'Galeria', value: 'gallery' },
            { label: 'Kronologjia', value: 'timeline' },
          ],
          required: true,
        },
        {
          name: 'label',
          type: 'text',
          label: 'Emri në Meny',
          required: true,
        },
        {
          name: 'enabled',
          type: 'checkbox',
          label: 'Shfaqet në Meny',
          defaultValue: true,
        },
      ],
    },
  ],
};
