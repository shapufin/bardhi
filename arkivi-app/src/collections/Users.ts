import type { CollectionConfig } from 'payload';
import { isSuperuser, superuserOnly, superuserOnlyField } from '@/src/lib/roles';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role'],
  },
  access: {
    // Superusers see everyone; authors only themselves; anonymous nothing (F-02, F-04).
    read: ({ req }) => {
      if (!req.user) return false;
      if (isSuperuser(req.user as { role?: string })) return true;
      return { id: { equals: req.user.id } };
    },
    create: superuserOnly,
    delete: superuserOnly,
    update: ({ req }) => {
      if (!req.user) return false;
      if (isSuperuser(req.user as { role?: string })) return true;
      return { id: { equals: req.user.id } };
    },
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
      access: {
        // Only superusers may set or change roles (blocks author -> superuser self-escalation).
        create: superuserOnlyField,
        update: superuserOnlyField,
      },
    },
  ],
};
