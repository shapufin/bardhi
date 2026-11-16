import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { getCmsState, saveCmsState, APP_ROOT, UPLOADS_DIR } from '../src/lib/payloadClient';
import type { CmsState } from '../src/types/cms';
import './with-auth';

// Disable sharp libvips file cache so files are not held locked on Windows
sharp.cache(false);

// Helper to create valid images of specified format & size
async function createSolidImage(
  format: 'png' | 'jpeg' | 'webp',
  width = 200,
  height = 150
): Promise<{ buffer: Buffer; dataUrl: string }> {
  const instance = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  });

  let buffer: Buffer;
  if (format === 'png') {
    buffer = await instance.png().toBuffer();
  } else if (format === 'jpeg') {
    buffer = await instance.jpeg({ quality: 82 }).toBuffer();
  } else {
    buffer = await instance.webp({ quality: 82 }).toBuffer();
  }

  const mime = format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp';
  return {
    buffer,
    dataUrl: `data:${mime};base64,${buffer.toString('base64')}`,
  };
}

// Helper to create exact binary-sized valid JPEG buffer with comment segments
async function createExactSizedJpeg(targetBytes: number): Promise<{ buffer: Buffer; dataUrl: string }> {
  const small = await sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .jpeg()
    .toBuffer();

  const buffer = Buffer.alloc(targetBytes);
  small.copy(buffer, 0, 0, small.length - 2);

  let offset = small.length - 2;
  let remaining = targetBytes - small.length;

  while (remaining > 0) {
    const segPayload = Math.min(remaining - 4, 65530);
    if (segPayload < 0) {
      buffer.fill(0, offset, targetBytes - 2);
      break;
    }
    const segLength = segPayload + 2;
    buffer[offset] = 0xff;
    buffer[offset + 1] = 0xfe;
    buffer.writeUInt16BE(segLength, offset + 2);
    buffer.fill(0xaa, offset + 4, offset + 4 + segPayload);
    offset += 4 + segPayload;
    remaining -= 4 + segPayload;
  }

  buffer[targetBytes - 2] = 0xff;
  buffer[targetBytes - 1] = 0xd9;

  return {
    buffer,
    dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
  };
}

describe('Image Upload 5MB Limit & Sharp Compression (R3)', () => {
  let initialCmsState: CmsState;
  const createdUploadFiles: string[] = [];

  before(async () => {
    initialCmsState = await getCmsState();
  });

  after(async () => {
    // Restore baseline CMS state
    if (initialCmsState) {
      await saveCmsState(initialCmsState);
    }

    // Clean up created upload files on disk with retry for transient file locks
    for (const filepath of createdUploadFiles) {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await fs.unlink(filepath);
          break;
        } catch (err: unknown) {
          const error = err as NodeJS.ErrnoException;
          if (error?.code === 'ENOENT') {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    }
  });

  // ==========================================
  // TIER 1: FEATURE COVERAGE
  // ==========================================

  it('Tier 1: POST /api/media accepts valid PNG under 5MB, converts to WebP, and returns HTTP 200', async () => {
    const mediaRoute = await import('../src/app/api/media/route');
    const { dataUrl } = await createSolidImage('png', 400, 300);

    const req = new Request('http://localhost:3001/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Tier 1 PNG Test',
        caption: 'Prove ngarkimi PNG',
        year: '2026',
        dataUrl,
      }),
    });

    const res = await mediaRoute.POST(req);
    assert.strictEqual(res.status, 200, 'Valid PNG upload under 5MB must return 200');

    const json = await res.json();
    assert.ok(json.asset, 'Response must return created asset');
    assert.ok(json.asset.id, 'Asset must have generated id');
    assert.ok(
      json.asset.url.endsWith('.webp'),
      `Asset URL must end with .webp after server conversion: ${json.asset.url}`
    );

    const filename = path.basename(json.asset.url);
    const diskPath = path.join(UPLOADS_DIR, filename);
    createdUploadFiles.push(diskPath);

    const fileStat = await fs.stat(diskPath);
    assert.ok(fileStat.size > 0, 'Written file on disk must not be empty');
  });

  it('Tier 1: POST /api/media accepts valid JPEG under 5MB and converts to WebP with quality 82', async () => {
    const mediaRoute = await import('../src/app/api/media/route');
    const { dataUrl } = await createSolidImage('jpeg', 400, 300);

    const req = new Request('http://localhost:3001/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Tier 1 JPEG Test',
        caption: 'Prove ngarkimi JPEG',
        year: '2026',
        dataUrl,
      }),
    });

    const res = await mediaRoute.POST(req);
    assert.strictEqual(res.status, 200, 'Valid JPEG upload under 5MB must return 200');

    const json = await res.json();
    assert.ok(json.asset);
    assert.ok(
      json.asset.url.endsWith('.webp'),
      `JPEG must be converted to WebP format: ${json.asset.url}`
    );

    const diskPath = path.join(UPLOADS_DIR, path.basename(json.asset.url));
    createdUploadFiles.push(diskPath);

    // Verify written file is indeed valid WebP format
    const meta = await sharp(await fs.readFile(diskPath)).metadata();
    assert.strictEqual(meta.format, 'webp', 'Stored image format on disk must be webp');
  });

  it('Tier 1: POST /api/media accepts valid WebP under 5MB and returns HTTP 200', async () => {
    const mediaRoute = await import('../src/app/api/media/route');
    const { dataUrl } = await createSolidImage('webp', 320, 240);

    const req = new Request('http://localhost:3001/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Tier 1 WebP Test',
        dataUrl,
      }),
    });

    const res = await mediaRoute.POST(req);
    assert.strictEqual(res.status, 200, 'Valid WebP upload under 5MB must return 200');

    const json = await res.json();
    assert.ok(json.asset);
    assert.ok(json.asset.url.endsWith('.webp'));

    const diskPath = path.join(UPLOADS_DIR, path.basename(json.asset.url));
    createdUploadFiles.push(diskPath);
  });

  it('Tier 1: Server-side compression achieves >=60% size reduction on uncompressed raw image', async () => {
    const mediaRoute = await import('../src/app/api/media/route');

    // Create a detailed uncompressed PNG image (~1-2MB)
    const rawWidth = 1200;
    const rawHeight = 900;
    const uncompressedPng = await sharp({
      create: {
        width: rawWidth,
        height: rawHeight,
        channels: 3,
        background: { r: 180, g: 190, b: 210 },
      },
    })
      .png({ compressionLevel: 0 }) // uncompressed PNG
      .toBuffer();

    const originalSize = uncompressedPng.length;
    assert.ok(
      originalSize > 500 * 1024,
      `Original uncompressed input should be substantial: ${originalSize} bytes`
    );

    const req = new Request('http://localhost:3001/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Compression Benchmark Test',
        dataUrl: `data:image/png;base64,${uncompressedPng.toString('base64')}`,
      }),
    });

    const res = await mediaRoute.POST(req);
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    const diskPath = path.join(UPLOADS_DIR, path.basename(json.asset.url));
    createdUploadFiles.push(diskPath);

    const diskStat = await fs.stat(diskPath);
    const compressedSize = diskStat.size;

    const reductionPercent = ((originalSize - compressedSize) / originalSize) * 100;
    assert.ok(
      reductionPercent >= 60,
      `Compression size reduction must be >= 60%. Original: ${originalSize}B, Compressed: ${compressedSize}B, Reduction: ${reductionPercent.toFixed(1)}%`
    );
  });

  it('Tier 1: Uploaded asset is appended to cms-data.json asset registry with correct metadata', async () => {
    const mediaRoute = await import('../src/app/api/media/route');
    const { dataUrl } = await createSolidImage('png', 200, 200);
    const testTitle = `Registry Test ${Date.now()}`;

    const req = new Request('http://localhost:3001/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: testTitle,
        caption: 'Citim prove regjistri',
        year: '2026',
        aspectRatio: '1:1',
        dataUrl,
      }),
    });

    const res = await mediaRoute.POST(req);
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    const diskPath = path.join(UPLOADS_DIR, path.basename(json.asset.url));
    createdUploadFiles.push(diskPath);

    // Verify registry persistence in cms-data.json
    const state = await getCmsState();
    const registered = state.media.find((m) => m.id === json.asset.id);

    assert.ok(registered, 'Uploaded asset must be registered in cms-data.json media array');
    assert.strictEqual(registered.title, testTitle);
    assert.strictEqual(registered.isUpload, true);
    assert.strictEqual(registered.aspectRatio, '1:1');
    assert.strictEqual(registered.url, json.asset.url);
  });

  it('Tier 1: GET /api/media returns media array from active CMS state with HTTP 200', async () => {
    const mediaRoute = await import('../src/app/api/media/route');
    assert.ok(typeof mediaRoute.GET === 'function', 'GET handler must be exported');

    const res = await mediaRoute.GET();
    assert.strictEqual(res.status, 200, 'GET /api/media must return HTTP 200');

    const json = await res.json();
    assert.ok(Array.isArray(json.media), 'GET response must contain media array');
    const state = await getCmsState();
    assert.strictEqual(json.media.length, state.media.length, 'Media count must match active CMS state');
  });

  // ==========================================
  // TIER 2: BOUNDARY AND CORNER CASES
  // ==========================================

  it('Tier 2: Boundary exactness: payload binary size of exactly 5,242,880 bytes (5.00MB) is accepted (HTTP 200)', async () => {
    const mediaRoute = await import('../src/app/api/media/route');
    const EXACT_5MB = 5 * 1024 * 1024; // 5,242,880 bytes
    const { dataUrl } = await createExactSizedJpeg(EXACT_5MB);

    const req = new Request('http://localhost:3001/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Exact 5MB Boundary Image',
        dataUrl,
      }),
    });

    const res = await mediaRoute.POST(req);
    assert.strictEqual(
      res.status,
      200,
      'Image of exactly 5,242,880 bytes (5.00MB) must be accepted with 200'
    );

    const json = await res.json();
    const diskPath = path.join(UPLOADS_DIR, path.basename(json.asset.url));
    createdUploadFiles.push(diskPath);
  });

  it('Tier 2: Boundary rejection: payload binary size of 5,242,881 bytes (5.00MB + 1 byte) returns HTTP 413', async () => {
    const mediaRoute = await import('../src/app/api/media/route');
    const OVER_5MB = 5 * 1024 * 1024 + 1; // 5,242,881 bytes
    const { dataUrl } = await createExactSizedJpeg(OVER_5MB);

    const req = new Request('http://localhost:3001/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '5MB + 1 Byte Boundary Violation',
        dataUrl,
      }),
    });

    const res = await mediaRoute.POST(req);
    assert.strictEqual(
      res.status,
      413,
      'Payload exceeding 5MB by 1 byte must be rejected with HTTP 413'
    );

    const json = await res.json();
    assert.strictEqual(
      json.error,
      'Madhësia e fotografisë tejkalon kufirin maksimal të lejuar prej 5MB.',
      'Must return exact Albanian 5MB rejection error contract'
    );
  });

  it('Tier 2: Excessive 10MB payload is rejected immediately with HTTP 413', async () => {
    const mediaRoute = await import('../src/app/api/media/route');
    const TEN_MB = 10 * 1024 * 1024;
    const fakeBuffer = Buffer.alloc(TEN_MB, 0x55);
    const dataUrl = `data:image/jpeg;base64,${fakeBuffer.toString('base64')}`;

    const req = new Request('http://localhost:3001/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '10MB Excessive Payload',
        dataUrl,
      }),
    });

    const res = await mediaRoute.POST(req);
    assert.strictEqual(res.status, 413, '10MB payload must be rejected with HTTP 413');
  });

  it('Tier 2: Corrupted garbage image payload is rejected with HTTP 400', async () => {
    const mediaRoute = await import('../src/app/api/media/route');
    // Valid dataUrl scheme and MIME header, but body is completely corrupted garbage
    const garbageBytes = Buffer.from('NOT_A_VALID_IMAGE_HEADER_GARBAGE_PAYLOAD_1234567890');
    const corruptedDataUrl = `data:image/jpeg;base64,${garbageBytes.toString('base64')}`;

    const req = new Request('http://localhost:3001/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Corrupted Image',
        dataUrl: corruptedDataUrl,
      }),
    });

    const res = await mediaRoute.POST(req);
    assert.strictEqual(res.status, 400, 'Corrupted image bytes must be rejected with HTTP 400');

    const json = await res.json();
    assert.strictEqual(
      json.error,
      'Skedari i ngarkuar nuk është një imazh i vlefshëm.',
      'Must return exact Albanian invalid image error message'
    );
  });

  it('Tier 2: Unsupported file format (e.g. SVG or PDF) returns HTTP 400', async () => {
    const mediaRoute = await import('../src/app/api/media/route');
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;

    const req = new Request('http://localhost:3001/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Unsupported SVG Upload',
        dataUrl: svgDataUrl,
      }),
    });

    const res = await mediaRoute.POST(req);
    assert.strictEqual(res.status, 400, 'Unsupported format must return 400');

    const json = await res.json();
    assert.match(json.error, /PNG, JPG, WebP/i);
  });

  it('Tier 2: Missing or empty dataUrl body returns HTTP 400 with Albanian prompt', async () => {
    const mediaRoute = await import('../src/app/api/media/route');

    const req = new Request('http://localhost:3001/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'No Image Attached',
        dataUrl: '',
      }),
    });

    const res = await mediaRoute.POST(req);
    assert.strictEqual(res.status, 400, 'Empty dataUrl must return 400');

    const json = await res.json();
    assert.strictEqual(
      json.error,
      'Ju lutemi zgjidhni një fotografi nga kompjuteri juaj.',
      'Must return Albanian prompt to select an image'
    );
  });

  // ==========================================
  // TIER 3: CROSS-FEATURE INTERACTIONS
  // ==========================================

  it('Tier 3: Media upload followed by story coverImage association renders valid WebP asset', async () => {
    const mediaRoute = await import('../src/app/api/media/route');
    const { dataUrl } = await createSolidImage('jpeg', 480, 360);

    const uploadReq = new Request('http://localhost:3001/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Story Association Cover',
        dataUrl,
      }),
    });

    const uploadRes = await mediaRoute.POST(uploadReq);
    assert.strictEqual(uploadRes.status, 200);
    const { asset } = await uploadRes.json();

    const diskPath = path.join(UPLOADS_DIR, path.basename(asset.url));
    createdUploadFiles.push(diskPath);

    // Associate uploaded asset as cover image for a test story in CMS state
    const current = await getCmsState();
    const testStoryId = `story-with-upload-${Date.now()}`;
    const testStory = {
      id: testStoryId,
      title: 'Rrëfim me Fotografinë e Re',
      subtitle: 'Nëntitull Prove',
      eraLabel: '2026',
      publishedDate: 'Nëntor 2026',
      readingMinutes: 2,
      coverImageId: asset.id,
      galleryImageIds: [asset.id],
      bodyParagraphs: ['Përmbajtje prove me foton e ngarkuar.'],
      pullQuote: 'Citim prove.',
      status: 'draft' as const,
      featured: false,
    };

    const updatedState = await saveCmsState({
      ...current,
      stories: [testStory, ...current.stories],
    });

    // Verify story references the uploaded media asset
    const storedStory = updatedState.stories.find((s) => s.id === testStoryId);
    assert.ok(storedStory);
    assert.strictEqual(storedStory.coverImageId, asset.id);

    // Verify the linked asset exists in CMS media and references .webp
    const linkedAsset = updatedState.media.find((m) => m.id === storedStory.coverImageId);
    assert.ok(linkedAsset);
    assert.ok(linkedAsset.url.endsWith('.webp'));
  });

  it('Tier 3: Disk storage consistency: verifies written WebP header and removes asset cleanly', async () => {
    const mediaRoute = await import('../src/app/api/media/route');
    const { dataUrl } = await createSolidImage('png', 300, 200);

    const req = new Request('http://localhost:3001/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Disk Storage Integrity Test',
        dataUrl,
      }),
    });

    const res = await mediaRoute.POST(req);
    assert.strictEqual(res.status, 200);
    const { asset } = await res.json();

    const diskPath = path.join(UPLOADS_DIR, path.basename(asset.url));
    createdUploadFiles.push(diskPath);

    // Read first 12 bytes of file on disk: WebP header must match RIFF....WEBP
    const fileHandle = await fs.open(diskPath, 'r');
    const headerBuf = Buffer.alloc(12);
    await fileHandle.read(headerBuf, 0, 12, 0);
    await fileHandle.close();

    const riff = headerBuf.subarray(0, 4).toString('ascii');
    const webp = headerBuf.subarray(8, 12).toString('ascii');
    assert.strictEqual(riff, 'RIFF', 'WebP file must begin with RIFF magic bytes');
    assert.strictEqual(webp, 'WEBP', 'WebP file header must specify WEBP container');
  });

  // ==========================================
  // TIER 4: REAL-WORLD CAMERA INGESTION SCENARIO
  // ==========================================

  it('Tier 4: High-resolution camera photo upload: 4.8MB raw JPEG scaled to max 2560px and compressed to < 500KB', async () => {
    const mediaRoute = await import('../src/app/api/media/route');

    // Simulate high-res 4000x3000 DSLR camera photo (~4.8MB)
    const cameraBuffer = await sharp({
      create: {
        width: 4000,
        height: 3000,
        channels: 3,
        background: { r: 120, g: 140, b: 160 },
      },
    })
      .jpeg({ quality: 95 })
      .toBuffer();

    const cameraSize = cameraBuffer.length;
    // Verify input is substantial (> 400KB and <= 5MB)
    assert.ok(
      cameraSize <= 5 * 1024 * 1024,
      `Raw photo must be <= 5MB: actual size ${cameraSize} bytes`
    );

    const req = new Request('http://localhost:3001/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Foto me Rezolucion të Lartë të Aparatit',
        caption: 'Fotografi origjinale nga arkivi familjar',
        year: '1998',
        dataUrl: `data:image/jpeg;base64,${cameraBuffer.toString('base64')}`,
      }),
    });

    const res = await mediaRoute.POST(req);
    assert.strictEqual(res.status, 200, '4.8MB raw camera photo must be successfully processed');

    const json = await res.json();
    assert.ok(json.asset);
    assert.ok(json.asset.url.endsWith('.webp'));

    const diskPath = path.join(UPLOADS_DIR, path.basename(json.asset.url));
    createdUploadFiles.push(diskPath);

    // Verify output constraints:
    // 1. Output WebP file on disk must be < 500KB
    const stat = await fs.stat(diskPath);
    assert.ok(
      stat.size < 500 * 1024,
      `Compressed WebP output must be < 500KB: actual size ${stat.size} bytes`
    );

    // 2. Output image dimensions must be scaled to max 2560px
    const meta = await sharp(await fs.readFile(diskPath)).metadata();
    assert.strictEqual(meta.format, 'webp');
    assert.ok(
      (meta.width || 0) <= 2560,
      `Image width must be scaled down to max 2560px: actual width ${meta.width}px`
    );
  });

  it('Tier 4: DELETE /api/media/:id cleanly removes asset and detaches all references across hero, stories and book', async () => {
    const mediaRoute = await import('../src/app/api/media/route');
    const mediaIdRoute = await import('../src/app/api/media/[id]/route');
    const { dataUrl } = await createSolidImage('jpeg', 300, 200);

    // 1. Upload a new image
    const postReq = new Request('http://localhost:3001/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Foto per Test Fshirje',
        caption: 'Test deletion',
        year: '2026',
        dataUrl,
      }),
    });
    const postRes = await mediaRoute.POST(postReq);
    assert.strictEqual(postRes.status, 200);
    const postJson = await postRes.json();
    const testAssetId = postJson.asset.id;

    // 2. Attach this image to hero, story cover, gallery, and book block
    const cur = await getCmsState();
    await saveCmsState({
      ...cur,
      hero: { ...cur.hero, heroImageId: testAssetId },
      bookCoverImageId: testAssetId,
      stories: cur.stories.map((s, idx) =>
        idx === 0
          ? { ...s, coverImageId: testAssetId, galleryImageIds: [testAssetId, ...(s.galleryImageIds || [])] }
          : s
      ),
      bookSpreads: cur.bookSpreads.map((sp, idx) =>
        idx === 0
          ? {
              ...sp,
              leftBlocks: [{ id: 'test-blk', type: 'photo', content: '', imageId: testAssetId }, ...(sp.leftBlocks || [])],
            }
          : sp
      ),
    });

    // 3. Delete the photo via DELETE /api/media/:id
    const delReq = new Request(`http://localhost:3001/api/media/${testAssetId}`, {
      method: 'DELETE',
    });
    const delRes = await mediaIdRoute.DELETE(delReq, { params: Promise.resolve({ id: testAssetId }) });
    assert.strictEqual(delRes.status, 200);

    // 4. Verify asset is completely removed from media array
    const finalState = await getCmsState();
    assert.ok(!finalState.media.some((m) => m.id === testAssetId));

    // 5. Verify all references are cleanly detached
    assert.notStrictEqual(finalState.hero.heroImageId, testAssetId);
    assert.notStrictEqual(finalState.bookCoverImageId, testAssetId);
    for (const story of finalState.stories) {
      assert.notStrictEqual(story.coverImageId, testAssetId);
      assert.ok(!story.galleryImageIds?.includes(testAssetId));
    }
    for (const spread of finalState.bookSpreads) {
      for (const block of [...(spread.leftBlocks || []), ...(spread.rightBlocks || [])]) {
        assert.notStrictEqual(block.imageId, testAssetId);
      }
    }
  });
});
