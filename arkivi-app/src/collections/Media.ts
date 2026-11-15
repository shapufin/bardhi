import { ValidationError, type CollectionConfig } from 'payload';

const MAX_PAYLOAD_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*'],
    formatOptions: {
      format: 'webp',
      options: { quality: 82 },
    },
    resizeOptions: {
      width: 2560,
      fit: 'inside',
      withoutEnlargement: true,
    },
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
      },
      {
        name: 'card',
        width: 768,
        height: 1024,
        position: 'centre',
      },
      {
        name: 'feature',
        width: 1920,
      },
    ],
    adminThumbnail: 'thumbnail',
  },
  hooks: {
    beforeValidate: [
      async ({ req, data }) => {
        const file = req.file || (req as unknown as { files?: { file?: { size?: number } } })?.files?.file;
        const fileSize = file?.size;
        if (typeof fileSize === 'number' && fileSize > MAX_PAYLOAD_IMAGE_SIZE) {
          throw new ValidationError({
            errors: [
              {
                message: 'Madhësia e fotografisë tejkalon kufirin maksimal të lejuar prej 5MB.',
                path: 'file',
              },
            ],
          });
        }
        return data;
      },
    ],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Titulli i Fotografisë',
      required: true,
      defaultValue: 'Fotografi Familjare',
    },
    {
      name: 'alt',
      type: 'text',
      label: 'Përshkrimi i Shkurtër (Alt)',
      defaultValue: 'Fotografi arkivore familjare',
    },
    {
      name: 'caption',
      type: 'textarea',
      label: 'Diçitura / Përshkrimi nën Foto',
    },
    {
      name: 'year',
      type: 'text',
      label: 'Viti i Shkrepjes',
      defaultValue: '2024',
    },
    {
      name: 'aspectRatio',
      type: 'select',
      label: 'Raporti i Pamjes',
      defaultValue: '4:3',
      options: [
        { label: '3:4 (Portret vertikal)', value: '3:4' },
        { label: '4:3 (Fotografi klasike)', value: '4:3' },
        { label: '16:9 (Panoramike e gjerë)', value: '16:9' },
        { label: '1:1 (Katror)', value: '1:1' },
      ],
    },
  ],
};
