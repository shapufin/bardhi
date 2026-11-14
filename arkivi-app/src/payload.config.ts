import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { buildConfig } from 'payload';
import { fileURLToPath } from 'url';

import { Users } from './collections/Users';
import { Stories } from './collections/Stories';
import { BookSpreads } from './collections/BookSpreads';
import { Media } from './collections/Media';
import { TimelineEntries } from './collections/TimelineEntries';

import { MemorialProfile } from './globals/MemorialProfile';
import { HeroSettings } from './globals/HeroSettings';
import { HomeLayout } from './globals/HomeLayout';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— Studio e Autorit',
      icons: [
        {
          rel: 'icon',
          type: 'image/x-icon',
          url: '/favicon.ico',
        },
      ],
    },
    components: {
      views: {
        dashboard: {
          Component: '@/src/components/admin/AdminStudioWrapper#AdminStudioWrapper',
        },
      },
    },
    livePreview: {
      url: () => `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'}/?preview=true`,
      collections: ['stories', 'book-spreads'],
      globals: ['memorial-profile', 'hero-settings', 'home-layout'],
    },
  },
  collections: [Users, Stories, BookSpreads, Media, TimelineEntries],
  globals: [MemorialProfile, HeroSettings, HomeLayout],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'sekret-arkivi-dritan-berisha-2026-autorit',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI || 'file:./data/arkivi.db',
    },
  }),
  localization: {
    locales: [
      {
        code: 'sq',
        label: 'Shqip',
      },
    ],
    defaultLocale: 'sq',
    fallback: true,
  },
});
