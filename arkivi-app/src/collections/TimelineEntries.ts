import type { CollectionConfig } from 'payload';

export const TimelineEntries: CollectionConfig = {
  slug: 'timeline-entries',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['year', 'title', 'sortOrder'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Renditja',
      required: true,
      defaultValue: 1,
    },
    {
      name: 'year',
      type: 'text',
      label: 'Viti',
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      label: 'Ngjarja / Titulli',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Përshkrimi i Kujtimit',
      required: true,
    },
  ],
};
