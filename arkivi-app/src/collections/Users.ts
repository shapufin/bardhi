import type { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Emri i Përdoruesit',
      required: true,
      defaultValue: 'Autori',
    },
    {
      name: 'role',
      type: 'select',
      label: 'Roli',
      defaultValue: 'author',
      options: [
        { label: 'Autor (Studio e Thjeshtuar)', value: 'author' },
        { label: 'Super Administrator Teknik', value: 'superuser' },
      ],
      required: true,
    },
  ],
};
