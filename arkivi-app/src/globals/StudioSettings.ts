import type { GlobalConfig } from 'payload';
import { hashStudioPassword } from '@/src/lib/studioAuth';

/**
 * Studio credentials managed from the technical admin panel (/admin).
 * The password is stored only as a scrypt hash — typing a new value and
 * saving replaces it; the existing hash is left untouched on unrelated saves.
 */
export const StudioSettings: GlobalConfig = {
  slug: 'studio-settings',
  label: 'Studio & Fjalëkalimi',
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'password',
      type: 'text',
      label: 'Fjalëkalimi i Studio-s',
      admin: {
        description:
          'Shkruani fjalëkalimin e ri dhe ruani — ruhet i enkriptuar (hash). Për ndryshim, shkruani fjalëkalimin e ri mbi vlerën ekzistuese.',
      },
      hooks: {
        beforeChange: [
          ({ value }) =>
            typeof value === 'string' && value.length > 0 && !value.startsWith('scrypt$')
              ? hashStudioPassword(value)
              : value,
        ],
      },
    },
  ],
};
