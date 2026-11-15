import type { GlobalConfig } from 'payload';

export const HeroSettings: GlobalConfig = {
  slug: 'hero-settings',
  label: 'Kryefaqja & Rrëfimi i Veçuar',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'kicker',
      type: 'text',
      label: 'Shiriti i Sipërm',
      defaultValue: 'Në Kujtim të Përhershëm · 1998 — 2024',
    },
    {
      name: 'headline',
      type: 'text',
      label: 'Titulli Kryesor i Kryefaqes',
      defaultValue: 'Një dëshmi e qetë për birin që na mësoi të shohim dritën në gjërat e thjeshta',
      required: true,
    },
    {
      name: 'subheadline',
      type: 'textarea',
      label: 'Përshkrimi i Kryefaqes',
      defaultValue: 'Rrëfime, letra nga shërbimi, fotografi të ruajtura në sirtar dhe kapitujt e një libri të shkruar me dorë — mbledhur këtu që kushdo që e deshi Dritanin ta gjejë gjithmonë pranë.',
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Portreti Kryesor i Kryefaqes',
    },
    {
      name: 'featuredStory',
      type: 'relationship',
      relationTo: 'stories',
      label: 'Rrëfimi i Veçuar në Kryefaqe',
    },
    {
      name: 'primaryCtaLabel',
      type: 'text',
      label: 'Butoni Kryesor',
      defaultValue: 'Lexo Rrëfimin Kryesor',
    },
    {
      name: 'secondaryCtaLabel',
      type: 'text',
      label: 'Butoni i Dytë',
      defaultValue: 'Hap Librin',
    },
    {
      name: 'animationEnabled',
      type: 'checkbox',
      label: 'Aktivizo Lëvizjen e Butë të Kryefaqes',
      defaultValue: true,
    },
    {
      name: 'animationStyle',
      type: 'select',
      label: 'Lloji i Lëvizjes',
      defaultValue: 'gentle-drift',
      options: [
        { label: 'Lëkundje e Lehtë Natyrore (Gentle Drift)', value: 'gentle-drift' },
        { label: 'Zbehje e Qetë (Soft Fade)', value: 'soft-fade' },
        { label: 'Pa Animacion (Statike)', value: 'none' },
      ],
    },
  ],
};
