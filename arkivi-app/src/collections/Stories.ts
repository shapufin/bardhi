import type { CollectionConfig } from 'payload';

export const Stories: CollectionConfig = {
  slug: 'stories',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'eraLabel', 'status', 'featured', 'publishedDate'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Titulli i Rrëfimit',
      required: true,
    },
    {
      name: 'subtitle',
      type: 'text',
      label: 'Nëntitulli / Përmbledhja',
    },
    {
      name: 'eraLabel',
      type: 'text',
      label: 'Periudha Kohore',
      defaultValue: 'Kujtime',
      admin: {
        description: 'p.sh. Fëmijëria, Vitet e Shërbimit, Rinia, Leja e Fundit',
      },
    },
    {
      name: 'publishedDate',
      type: 'text',
      label: 'Data e Shfaqur',
      defaultValue: 'Nëntor 2024',
    },
    {
      name: 'readingMinutes',
      type: 'number',
      label: 'Minuta Leximi',
      defaultValue: 4,
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Fotografia Kryesore e Rrëfimit',
    },
    {
      name: 'galleryImages',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
      label: 'Fotografitë e Tjera të Galerisë',
    },
    {
      name: 'bodyParagraphs',
      type: 'array',
      label: 'Paragrafët e Rrëfimit',
      fields: [
        {
          name: 'text',
          type: 'textarea',
          label: 'Paragrafi',
          required: true,
        },
      ],
    },
    {
      name: 'pullQuote',
      type: 'textarea',
      label: 'Fjali e Veçuar (Citim)',
    },
    {
      name: 'status',
      type: 'select',
      label: 'Gjendja e Publikimit',
      defaultValue: 'published',
      options: [
        { label: 'E Publikuar', value: 'published' },
        { label: 'Draft (E Fshehur)', value: 'draft' },
      ],
      required: true,
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Rrëfim i Veçuar në Ballinë',
      defaultValue: false,
    },
  ],
};
