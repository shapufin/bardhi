import './test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PhysicalBookReader } from '../src/components/frontend/PhysicalBookReader';
import { CmsProvider } from '../src/context/CmsContext';
import { DEFAULT_CMS_STATE as d } from '../src/lib/defaultData';

const base = {
  bookTitle: d.bookTitle,
  bookSubtitle: d.bookSubtitle,
  authorName: d.site.authorName,
  bookCoverImageId: d.bookCoverImageId,
  spreads: d.bookSpreads,
  getMedia: (id?: string) => d.media.find((m) => m.id === id),
  onExitBook: () => {},
};
const render = (extra: object) =>
  renderToStaticMarkup(
    React.createElement(CmsProvider, null, React.createElement(PhysicalBookReader, { ...base, ...extra }))
  );

test('F-05: edit button is hidden by default (public visitors) and shown only when canEdit', () => {
  assert.ok(render({ canEdit: true }).includes('Redakto Librin'), 'control: canEdit=true must render the button');
  assert.ok(!render({}).includes('Redakto Librin'), 'default must not render the button');
});
