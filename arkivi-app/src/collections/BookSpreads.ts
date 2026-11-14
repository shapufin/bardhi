import type { Block, CollectionConfig } from 'payload';

const ProseBlock: Block = {
  slug: 'prose',
  labels: {
    singular: 'Paragraf Teksti',
    plural: 'Paragrafë Teksti',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: 'Nëntitull Paragrafi',
    },
    {
      name: 'content',
      type: 'textarea',
      label: 'Përmbajtja e Paragrafit',
      required: true,
    },
    {
      name: 'dropCap',
      type: 'checkbox',
      label: 'Shkronjë e Madhe Fillestare (Drop Cap)',
      defaultValue: false,
    },
  ],
};

const PhotoBlock: Block = {
  slug: 'photo',
  labels: {
    singular: 'Foto me Diçiturë',
    plural: 'Foto me Diçiturë',
  },
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Fotografia nga Arkivi',
      required: true,
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Diçitura e Fotos',
    },
  ],
};

const QuoteBlock: Block = {
  slug: 'quote',
  labels: {
    singular: 'Thënie e Veçuar',
    plural: 'Thënie të Veçuara',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: 'Etiketa e Citimit (p.sh. Kushtim)',
      defaultValue: 'Kushtim',
    },
    {
      name: 'content',
      type: 'textarea',
      label: 'Teksti i Thënies',
      required: true,
    },
  ],
};

const HandwrittenNoteBlock: Block = {
  slug: 'handwritten-note',
  labels: {
    singular: 'Shënim me Shkrim Dore',
    plural: 'Shënime me Shkrim Dore',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: 'Titulli i Shënimit',
      defaultValue: 'Shënim nga fletorja',
    },
    {
      name: 'content',
      type: 'textarea',
      label: 'Teksti i Shënimit',
      required: true,
    },
  ],
};

export const BookSpreads: CollectionConfig = {
  slug: 'book-spreads',
  admin: {
    useAsTitle: 'spreadTitle',
    defaultColumns: ['sortOrder', 'chapterLabel', 'spreadTitle', 'leftPageNumber', 'rightPageNumber'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Renditja e Fletës',
      required: true,
      defaultValue: 1,
    },
    {
      name: 'chapterLabel',
      type: 'text',
      label: 'Kapitulli',
      defaultValue: 'Prolog',
    },
    {
      name: 'spreadTitle',
      type: 'text',
      label: 'Titulli i Fletës Dyshe',
      required: true,
    },
    {
      name: 'leftPageNumber',
      type: 'number',
      label: 'Numri i Faqes Majtas',
      required: true,
    },
    {
      name: 'rightPageNumber',
      type: 'number',
      label: 'Numri i Faqes Djathtas',
      required: true,
    },
    {
      name: 'leftBlocks',
      type: 'blocks',
      label: 'Blloqet e Faqes Majtas',
      blocks: [ProseBlock, PhotoBlock, QuoteBlock, HandwrittenNoteBlock],
    },
    {
      name: 'rightBlocks',
      type: 'blocks',
      label: 'Blloqet e Faqes Djathtas',
      blocks: [ProseBlock, PhotoBlock, QuoteBlock, HandwrittenNoteBlock],
    },
  ],
};
