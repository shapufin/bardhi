import React, { useCallback, useEffect, useRef, useState } from 'react';
import { animated, to, useSpring } from '@react-spring/web';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  List,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { ArchivalImage } from '@/src/components/ArchivalImage';
import { BookPageContent } from '@/src/components/frontend/BookPageContent';
import { BookInlineEditor } from '@/src/components/frontend/BookInlineEditor';
import { useCms } from '@/src/context/CmsContext';
import type { BookBlock, BookSpread, MediaAsset } from '@/src/types/cms';

interface PhysicalBookReaderProps {
  bookTitle: string;
  bookSubtitle: string;
  authorName: string;
  bookCoverImageId?: string;
  spreads: BookSpread[];
  getMedia: (id?: string) => MediaAsset | undefined;
  onExitBook: () => void;
  canEdit?: boolean;
}

interface SingleFolioData {
  blocks: BookBlock[];
  pageNumber: number;
  side: 'left' | 'right';
  spread: BookSpread;
}

interface TurnDescriptor {
  dir: -1 | 1;
  fromIdx: number;
  toIdx: number;
}

interface ReaderNavState {
  spreadIndex: number;
  mobilePageIdx: number;
  turning: TurnDescriptor | null;
}

export function PhysicalBookReader({
  bookTitle,
  bookSubtitle,
  authorName,
  bookCoverImageId,
  spreads,
  getMedia,
  onExitBook,
  canEdit = true,
}: PhysicalBookReaderProps) {
  const { cms, saving, saveBook } = useCms();

  // Draft state for instant in-book editing (synced with incoming CMS props when not actively editing)
  const [editMode, setEditMode] = useState(false);
  const [draftTitle, setDraftTitle] = useState(bookTitle);
  const [draftSubtitle, setDraftSubtitle] = useState(bookSubtitle);
  const [draftCoverId, setDraftCoverId] = useState(bookCoverImageId || '');
  const [draftSpreads, setDraftSpreads] = useState<BookSpread[]>(spreads);

  useEffect(() => {
    if (!editMode) {
      setDraftTitle(bookTitle);
      setDraftSubtitle(bookSubtitle);
      setDraftCoverId(bookCoverImageId || '');
      setDraftSpreads(spreads);
    }
  }, [editMode, bookTitle, bookSubtitle, bookCoverImageId, spreads]);

  const activeTitle = editMode ? draftTitle : bookTitle;
  const activeSubtitle = editMode ? draftSubtitle : bookSubtitle;
  const activeCoverId = editMode ? draftCoverId : bookCoverImageId;
  const activeSpreads = editMode ? draftSpreads : spreads;

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [coverClosed, setCoverClosed] = useState(false);
  const [perspective3D, setPerspective3D] = useState(true);
  const [showChapters, setShowChapters] = useState(false);
  const [dockOpen, setDockOpen] = useState(true);
  const [cleanMode, setCleanMode] = useState(false);
  const [hoverEdge, setHoverEdge] = useState<'left' | 'right' | null>(null);

  // Atomic state prevents 1-frame index vs turning-leaf desync glitches
  const [navState, setNavState] = useState<ReaderNavState>({
    spreadIndex: 0,
    mobilePageIdx: 0,
    turning: null,
  });

  // Token increments on every spring start/stop so stale onRest callbacks never fire late
  const turnTokenRef = useRef(0);

  const dragRef = useRef<{
    active: boolean;
    startX: number;
    moved: boolean;
    dir: -1 | 1;
    currentProgress: number;
    fromIdx: number;
    toIdx: number;
    pointerId: number | null;
  }>({
    active: false,
    startX: 0,
    moved: false,
    dir: 1,
    currentProgress: 0,
    fromIdx: 0,
    toIdx: 0,
    pointerId: null,
  });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const flatPages: SingleFolioData[] = activeSpreads.flatMap((sp) => [
    { blocks: sp.leftBlocks, pageNumber: sp.leftPageNumber, side: 'left' as const, spread: sp },
    { blocks: sp.rightBlocks, pageNumber: sp.rightPageNumber, side: 'right' as const, spread: sp },
  ]);

  const maxIndex = isMobile
    ? Math.max(0, flatPages.length - 1)
    : Math.max(0, activeSpreads.length - 1);
  const activeIdx = isMobile
    ? Math.min(navState.mobilePageIdx, maxIndex)
    : Math.min(navState.spreadIndex, maxIndex);

  // 1. React-Spring: Page Flip Physics
  const [turnSpring, turnApi] = useSpring(() => ({
    flipDeg: 0,
    config: { mass: 1.0, tension: 220, friction: 26 },
  }));

  // 2. React-Spring: Hardcover Open/Close & Centered Desk Shift
  const coverSpring = useSpring({
    coverDeg: coverClosed && !editMode ? 0 : -180,
    shiftX: coverClosed && !isMobile && !editMode ? -25 : 0,
    config: { mass: 1.25, tension: 170, friction: 24 },
  });

  // 3. React-Spring: Subtle 3D Perspective Desk Tilt
  const [tiltSpring, tiltApi] = useSpring(() => ({
    tiltX: perspective3D ? 13 : 4,
    tiltY: 0,
    scale: perspective3D ? 0.965 : 1,
    config: { mass: 1, tension: 150, friction: 24 },
  }));

  useEffect(() => {
    tiltApi.start({
      tiltX: coverClosed ? 16 : perspective3D ? 13 : 4,
      tiltY: coverClosed ? -5 : 0,
      scale: perspective3D ? 0.965 : 1,
    });
  }, [perspective3D, coverClosed, tiltApi]);

  const commitIndexAtomic = useCallback(
    (nextIdx: number) => {
      const clamped = Math.max(0, Math.min(maxIndex, nextIdx));
      if (isMobile) {
        setNavState({
          spreadIndex: Math.floor(clamped / 2),
          mobilePageIdx: clamped,
          turning: null,
        });
      } else {
        setNavState({
          spreadIndex: clamped,
          mobilePageIdx: clamped * 2,
          turning: null,
        });
      }
    },
    [isMobile, maxIndex]
  );

  const jumpToSpread = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(activeSpreads.length - 1, idx));
      turnTokenRef.current += 1;
      turnApi.stop();
      dragRef.current.active = false;
      setCoverClosed(false);
      setNavState({
        spreadIndex: clamped,
        mobilePageIdx: clamped * 2,
        turning: null,
      });
    },
    [activeSpreads.length, turnApi]
  );

  const triggerTurn = useCallback(
    (delta: -1 | 1) => {
      if (editMode || cleanMode) {
        const next = Math.max(0, Math.min(activeSpreads.length - 1, navState.spreadIndex + delta));
        jumpToSpread(next);
        return;
      }

      if (coverClosed) {
        if (delta > 0) setCoverClosed(false);
        return;
      }

      // If a turn is already animating, jump cleanly to its destination first
      const baseIdx = navState.turning ? navState.turning.toIdx : activeIdx;
      const targetIdx = baseIdx + delta;

      if (delta === -1 && baseIdx === 0 && !isMobile) {
        turnTokenRef.current += 1;
        turnApi.stop();
        setNavState({ spreadIndex: 0, mobilePageIdx: 0, turning: null });
        setCoverClosed(true);
        return;
      }

      if (targetIdx < 0 || targetIdx > maxIndex) {
        if (navState.turning) commitIndexAtomic(baseIdx);
        return;
      }

      const startDeg = delta === 1 ? 0 : -180;
      const endDeg = delta === 1 ? -180 : 0;

      turnTokenRef.current += 1;
      const token = turnTokenRef.current;

      setNavState((prev) => ({
        spreadIndex: isMobile ? Math.floor(baseIdx / 2) : baseIdx,
        mobilePageIdx: isMobile ? baseIdx : baseIdx * 2,
        turning: { dir: delta, fromIdx: baseIdx, toIdx: targetIdx },
      }));

      turnApi.stop();
      turnApi.set({ flipDeg: startDeg });
      turnApi.start({
        flipDeg: endDeg,
        config: { mass: 1.0, tension: 215, friction: 25 },
        onRest: (result) => {
          if (token !== turnTokenRef.current) return;
          if (result.finished) {
            commitIndexAtomic(targetIdx);
          }
        },
      });
    },
    [
      activeIdx,
      activeSpreads.length,
      cleanMode,
      commitIndexAtomic,
      coverClosed,
      editMode,
      isMobile,
      jumpToSpread,
      maxIndex,
      navState.spreadIndex,
      navState.turning,
      turnApi,
    ]
  );

  // Keyboard navigation (disabled when typing inside Direct Edit mode!)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (cleanMode || editMode) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') triggerTurn(1);
      if (e.key === 'ArrowLeft') triggerTurn(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cleanMode, editMode, triggerTurn]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editMode) return;
    if (coverClosed) {
      setCoverClosed(false);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / Math.max(1, rect.width);

    const baseIdx = navState.turning ? navState.turning.toIdx : activeIdx;
    const dir: -1 | 1 = relX >= 0.5 ? 1 : -1;
    const nextIdx = baseIdx + dir;

    if (dir === -1 && baseIdx === 0 && !isMobile) {
      turnTokenRef.current += 1;
      turnApi.stop();
      setNavState({ spreadIndex: 0, mobilePageIdx: 0, turning: null });
      setCoverClosed(true);
      return;
    }
    if (nextIdx < 0 || nextIdx > maxIndex) return;

    turnTokenRef.current += 1;
    turnApi.stop();

    dragRef.current = {
      active: true,
      startX: e.clientX,
      moved: false,
      dir,
      currentProgress: dir === 1 ? 0.01 : 0.99,
      fromIdx: baseIdx,
      toIdx: nextIdx,
      pointerId: e.pointerId,
    };

    setNavState({
      spreadIndex: isMobile ? Math.floor(baseIdx / 2) : baseIdx,
      mobilePageIdx: isMobile ? baseIdx : baseIdx * 2,
      turning: { dir, fromIdx: baseIdx, toIdx: nextIdx },
    });

    turnApi.set({ flipDeg: dir === 1 ? -1.5 : -178.5 });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if capture unsupported
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / Math.max(1, rect.width);

    if (!dragRef.current.active && perspective3D && !coverClosed && !isMobile) {
      const tiltY = (relX - 0.5) * -6;
      const relY = (e.clientY - rect.top) / Math.max(1, rect.height);
      const tiltX = 13 + (relY - 0.5) * -4;
      tiltApi.start({ tiltX, tiltY });
      setHoverEdge(relX > 0.72 ? 'right' : relX < 0.28 ? 'left' : null);
    }

    if (!dragRef.current.active) return;

    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 6) dragRef.current.moved = true;

    const span = Math.max(130, rect.width * 0.45);
    const progress =
      dragRef.current.dir === 1
        ? Math.max(0.01, Math.min(0.99, -dx / span))
        : Math.max(0.01, Math.min(0.99, 1 - dx / span));

    dragRef.current.currentProgress = progress;
    turnApi.set({ flipDeg: -progress * 180 });
  };

  const handlePointerUp = () => {
    if (!dragRef.current.active) return;
    const { moved, dir, currentProgress, fromIdx, toIdx } = dragRef.current;
    dragRef.current.active = false;
    dragRef.current.pointerId = null;

    const shouldComplete = !moved
      ? true
      : dir === 1
        ? currentProgress > 0.24
        : currentProgress < 0.76;

    const finalDeg = shouldComplete ? (dir === 1 ? -180 : 0) : dir === 1 ? 0 : -180;
    const finalIdx = shouldComplete ? toIdx : fromIdx;

    turnTokenRef.current += 1;
    const token = turnTokenRef.current;

    turnApi.start({
      flipDeg: finalDeg,
      config: { mass: 1.0, tension: 225, friction: 26 },
      onRest: (result) => {
        if (token !== turnTokenRef.current) return;
        if (result.finished) {
          commitIndexAtomic(finalIdx);
        }
      },
    });
  };

  const handleSaveBookEdit = async () => {
    await saveBook({
      bookTitle: draftTitle,
      bookSubtitle: draftSubtitle,
      bookCoverImageId: draftCoverId,
      bookSpreads: draftSpreads,
    });
  };

  const coverAsset = activeCoverId ? getMedia(activeCoverId) : undefined;
  const safeSpreadIdx = Math.min(navState.spreadIndex, Math.max(0, activeSpreads.length - 1));
  const currentSpread = activeSpreads[safeSpreadIdx];

  if (!currentSpread) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
        <h2 className="mt-4 font-serif text-3xl text-foreground">Nuk ka faqe të botuara ende</h2>
        <p className="mt-2 text-muted-foreground">
          Shtoni fleta dhe shënime te Ndërtuesi i Librit në Studion e Autorit.
        </p>
        <Button onClick={onExitBook} className="mt-6">
          Kthehu në Ballinë
        </Button>
      </div>
    );
  }

  // Clean Accessible Large-Print Mode
  if (cleanMode && !editMode) {
    return (
      <section className="min-h-[calc(100vh-73px)] bg-background py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={onExitBook} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Ballina</span>
              </Button>
              <div>
                <h1 className="font-serif text-2xl font-medium text-foreground">{activeTitle}</h1>
                <p className="text-xs text-muted-foreground">
                  {activeSubtitle} · {authorName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCleanMode(false);
                    setCoverClosed(false);
                    setEditMode(true);
                  }}
                  className="gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Redakto Librin</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setCleanMode(false)}>
                Shiko Librin 3D
              </Button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentSpread.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 grid grid-cols-1 border border-border bg-card lg:grid-cols-2"
            >
              {[
                {
                  blocks: currentSpread.leftBlocks,
                  page: currentSpread.leftPageNumber,
                  label: currentSpread.chapterLabel,
                },
                {
                  blocks: currentSpread.rightBlocks,
                  page: currentSpread.rightPageNumber,
                  label: currentSpread.spreadTitle,
                },
              ].map((col, i) => (
                <div
                  key={i}
                  className={`flex min-h-[480px] flex-col justify-between p-8 sm:p-12 ${
                    i === 0 ? 'border-b border-border lg:border-b-0 lg:border-r' : ''
                  }`}
                >
                  <div className="space-y-6">
                    <div className="flex justify-between border-b border-border pb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      <span>{col.label}</span>
                      <span>Faqja {String(col.page).padStart(2, '0')}</span>
                    </div>
                    {col.blocks.map((block) => {
                      if (block.type === 'photo') {
                        const asset = getMedia(block.imageId);
                        return (
                          <figure key={block.id} className="space-y-2">
                            <div className="aspect-[4/3] overflow-hidden border border-border">
                              <ArchivalImage
                                src={asset?.url}
                                alt={asset?.alt || block.content}
                                className="h-full w-full"
                              />
                            </div>
                            {(block.caption || asset?.caption) && (
                              <figcaption className="font-serif text-sm italic text-muted-foreground">
                                {block.caption || asset?.caption}
                              </figcaption>
                            )}
                          </figure>
                        );
                      }
                      if (block.type === 'quote') {
                        return (
                          <blockquote
                            key={block.id}
                            className="border-y border-border py-5 text-center font-serif text-2xl italic"
                          >
                            {block.content}
                            {block.caption && (
                              <footer className="mt-2 font-sans text-xs uppercase tracking-widest text-muted-foreground">
                                · {block.caption}
                              </footer>
                            )}
                          </blockquote>
                        );
                      }
                      if (block.type === 'handwritten-note') {
                        return (
                          <div key={block.id} className="border border-border bg-secondary/50 p-5">
                            {block.heading && (
                              <p className="font-mono text-xs uppercase tracking-widest text-primary">
                                {block.heading}
                              </p>
                            )}
                            <p className="mt-2 whitespace-pre-line font-serif text-lg italic leading-relaxed">
                              {block.content}
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div key={block.id} className="space-y-3">
                          {block.heading && (
                            <h2 className="font-serif text-2xl font-medium text-foreground">
                              {block.heading}
                            </h2>
                          )}
                          <p
                            className={`whitespace-pre-line font-serif text-lg leading-[1.82] ${
                              block.dropCap ? 'archival-drop-cap' : ''
                            }`}
                          >
                            {block.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              disabled={safeSpreadIdx === 0}
              onClick={() => jumpToSpread(safeSpreadIdx - 1)}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Faqja e Mëparshme</span>
            </Button>
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              Fleta {safeSpreadIdx + 1} nga {activeSpreads.length}
            </span>
            <Button
              variant="outline"
              disabled={safeSpreadIdx >= activeSpreads.length - 1}
              onClick={() => jumpToSpread(safeSpreadIdx + 1)}
              className="gap-2"
            >
              <span>Faqja Tjetër</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Stationary & Turning Folio Slots (Atomic)
  const turning = navState.turning;
  const idleSp = activeSpreads[activeIdx] || currentSpread;

  const stationaryLeftSp =
    turning?.dir === -1 ? activeSpreads[turning.toIdx] || idleSp : activeSpreads[turning?.fromIdx ?? activeIdx] || idleSp;
  const stationaryRightSp =
    turning?.dir === 1 ? activeSpreads[turning.toIdx] || idleSp : activeSpreads[turning?.fromIdx ?? activeIdx] || idleSp;

  const turningFrontSp =
    turning?.dir === 1 ? activeSpreads[turning.fromIdx] || idleSp : activeSpreads[turning?.toIdx ?? activeIdx] || idleSp;
  const turningBackSp =
    turning?.dir === 1 ? activeSpreads[turning.toIdx] || idleSp : activeSpreads[turning?.fromIdx ?? activeIdx] || idleSp;

  const progressRatio = activeSpreads.length > 1 ? activeIdx / (activeSpreads.length - 1) : 0.5;
  const leftStackWidth = Math.round(4 + progressRatio * 10);
  const rightStackWidth = Math.round(14 - progressRatio * 10);

  const mobCurrent = flatPages[activeIdx] || flatPages[0];
  const mobUnder = turning ? flatPages[turning.toIdx] || mobCurrent : mobCurrent;
  const mobTurning =
    turning?.dir === 1 ? flatPages[turning.fromIdx] || mobCurrent : flatPages[turning?.toIdx ?? activeIdx] || mobCurrent;

  return (
    <section className="relative flex min-h-[calc(100vh-73px)] w-full flex-col justify-between overflow-x-hidden bg-[#eae3d5] px-3 pb-28 pt-4 sm:px-6 sm:pt-6">
      {/* Shiriti i sipërm minimal */}
      <div className="relative z-20 mx-auto flex w-full max-w-6xl flex-wrap items-start justify-between gap-3">
        <div className="border border-border bg-[#faf8f3]/95 px-4 py-2.5">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {coverClosed && !isMobile && !editMode
              ? 'Kopertina e Librit'
              : isMobile && !editMode
                ? `${mobCurrent.spread.chapterLabel} · Faqja ${mobCurrent.pageNumber}`
                : `${currentSpread.chapterLabel} · Faqet ${currentSpread.leftPageNumber} - ${currentSpread.rightPageNumber}`}
          </p>
          <h1 className="font-serif text-lg font-medium text-foreground sm:text-xl">
            {coverClosed && !isMobile && !editMode
              ? `${activeTitle} : ${authorName}`
              : `${activeTitle} : ${isMobile && !editMode ? mobCurrent.spread.spreadTitle : currentSpread.spreadTitle}`}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setCoverClosed(false);
                setCleanMode(false);
                setEditMode((v) => !v);
              }}
              className={`gap-1.5 ${editMode ? '' : 'bg-[#faf8f3]'}`}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>{editMode ? 'Dil nga Editimi' : 'Redakto Librin'}</span>
            </Button>
          )}
          {!editMode && (
            <Button variant="outline" size="sm" onClick={() => setCleanMode(true)} className="bg-[#faf8f3]">
              Lexim i Pastër
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onExitBook} className="gap-1.5 bg-[#faf8f3]">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Ballina</span>
          </Button>
        </div>
      </div>

      {/* MODALITETI EDIT DIREKT NË LIBËR OSE SKENA 3D */}
      {editMode ? (
        <div className="mt-6 flex-1">
          <BookInlineEditor
            bookTitle={draftTitle}
            bookSubtitle={draftSubtitle}
            bookCoverImageId={draftCoverId}
            spreads={draftSpreads}
            spreadIndex={safeSpreadIdx}
            mediaList={cms?.media || []}
            getMedia={getMedia}
            saving={saving}
            onChangeBookTitle={setDraftTitle}
            onChangeBookSubtitle={setDraftSubtitle}
            onChangeCoverImageId={setDraftCoverId}
            onChangeSpreads={setDraftSpreads}
            onSelectSpreadIndex={jumpToSpread}
            onSave={handleSaveBookEdit}
            onCloseEdit={() => setEditMode(false)}
          />
        </div>
      ) : (
        <div
          className="relative mx-auto my-4 flex w-full max-w-6xl flex-1 items-center justify-center"
          style={{ perspective: '2400px' }}
        >
          {/* Hije kontakti mbi tavolinë */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 bottom-3 mx-auto h-12 max-w-4xl rounded-[100%] bg-[#1a1611]/20 blur-xl"
          />

          {isMobile ? (
            /* PAMJA CELULAR: Fletë e plotë 3D me kthim të pastër pa prerje */
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative mx-auto aspect-[5/7] w-full max-w-[430px] touch-none select-none"
              style={{ perspective: '1800px' }}
            >
              <div className="absolute -inset-2 rounded-sm border border-[#142b1f] bg-[#1b3b2b] shadow-2xl">
                <div className="h-full w-full border border-[#c5a56d]/40" />
              </div>

              <div className="relative h-full w-full overflow-hidden border border-[#d5cebf] bg-[#faf7ef] shadow-inner">
                <BookPageContent
                  side={mobUnder.side}
                  blocks={mobUnder.blocks}
                  pageNumber={mobUnder.pageNumber}
                  spread={mobUnder.spread}
                  bookTitle={activeTitle}
                  getMedia={getMedia}
                  compact
                />
              </div>

              {turning && (
                <animated.div
                  style={{
                    transformOrigin: 'left center',
                    transformStyle: 'preserve-3d',
                    willChange: 'transform, opacity',
                    transform: turnSpring.flipDeg.to(
                      (deg) => `translateZ(4px) rotateY(${deg * 0.65}deg)`
                    ),
                    opacity: turnSpring.flipDeg.to((deg) => {
                      const p = Math.abs(deg) / 180;
                      return p > 0.72 ? Math.max(0, 1 - (p - 0.72) / 0.28) : 1;
                    }),
                  }}
                  className="pointer-events-none absolute inset-0 z-20 border border-[#cfc7b4] bg-[#faf7ef] shadow-2xl"
                >
                  <BookPageContent
                    side={mobTurning.side}
                    blocks={mobTurning.blocks}
                    pageNumber={mobTurning.pageNumber}
                    spread={mobTurning.spread}
                    bookTitle={activeTitle}
                    getMedia={getMedia}
                    compact
                    staticSnapshot
                  />
                  <animated.div
                    style={{
                      opacity: turnSpring.flipDeg.to(
                        (deg) => Math.sin((Math.abs(deg) * Math.PI) / 180) * 0.25
                      ),
                    }}
                    className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/15"
                  />
                </animated.div>
              )}
            </div>
          ) : (
            /* PAMJA DESKTOP / TABLET: Libër 3D me mbështjellës të ndarë shiftX dhe tiltX/Y */
            <animated.div
              style={{
                width: '100%',
                maxWidth: '1040px',
                transformStyle: 'preserve-3d',
                transform: coverSpring.shiftX.to((x) => `translateX(${x}%)`),
              }}
              className="relative"
            >
              <animated.div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={() => {
                  setHoverEdge(null);
                  if (!dragRef.current.active && !coverClosed) {
                    tiltApi.start({ tiltX: perspective3D ? 13 : 4, tiltY: 0 });
                  }
                }}
                style={{
                  transformStyle: 'preserve-3d',
                  willChange: 'transform',
                  transform: to(
                    [tiltSpring.tiltX, tiltSpring.tiltY, tiltSpring.scale],
                    (rx, ry, s) => `rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`
                  ),
                }}
                className="relative aspect-[100/70] w-full touch-none select-none cursor-grab active:cursor-grabbing"
              >
                {/* Trupi i Kapakut të Pasëm */}
                <div
                  className="absolute -inset-3 rounded-sm border border-[#10261b] bg-[#1b3b2b] shadow-[0_28px_60px_-15px_rgba(20,18,14,0.55)]"
                  style={{ transform: 'translateZ(-16px)' }}
                >
                  <div className="pointer-events-none absolute inset-1.5 border border-[#c5a56d]/35" />
                  <div className="pointer-events-none absolute left-0 top-0 h-5 w-5 border-l-4 border-t-4 border-[#c5a56d]" />
                  <div className="pointer-events-none absolute right-0 top-0 h-5 w-5 border-r-4 border-t-4 border-[#c5a56d]" />
                  <div className="pointer-events-none absolute bottom-0 left-0 h-5 w-5 border-b-4 border-l-4 border-[#c5a56d]" />
                  <div className="pointer-events-none absolute bottom-0 right-0 h-5 w-5 border-b-4 border-r-4 border-[#c5a56d]" />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-7 left-1/2 h-9 w-4 -translate-x-1/2 rotate-[6deg] bg-[#6b241c] shadow-md"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}
                  />
                </div>

                {/* Shtresa e Trashësisë së Fletëve Majtas & Djathtas */}
                <div
                  aria-hidden="true"
                  style={{ width: `${leftStackWidth}px`, transform: 'translateZ(-8px)' }}
                  className="pointer-events-none absolute inset-y-1 -left-2 border-y border-l border-[#cfc6b2] bg-gradient-to-r from-[#dfd7c5] via-[#efe9da] to-[#faf7ef]"
                />
                <div
                  aria-hidden="true"
                  style={{ width: `${rightStackWidth}px`, transform: 'translateZ(-8px)' }}
                  className="pointer-events-none absolute inset-y-1 -right-2 border-y border-r border-[#cfc6b2] bg-gradient-to-l from-[#dfd7c5] via-[#efe9da] to-[#faf7ef]"
                />

                {/* Fletët Statike të Hapura */}
                <div
                  className="relative grid h-full w-full grid-cols-2 border border-[#cfc6b2] bg-[#faf7ef]"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Kurrizi qendror */}
                  <div
                    aria-hidden="true"
                    style={{ transform: 'translateZ(1px)' }}
                    className="pointer-events-none absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#171614]/[0.16] to-transparent"
                  />

                  {/* Faqja e Majtë Statike */}
                  <div className="relative h-full border-r border-[#dcd6c8]">
                    <BookPageContent
                      side="left"
                      blocks={stationaryLeftSp.leftBlocks}
                      pageNumber={stationaryLeftSp.leftPageNumber}
                      spread={stationaryLeftSp}
                      bookTitle={activeTitle}
                      getMedia={getMedia}
                    />
                    {hoverEdge === 'left' && !coverClosed && !turning && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="pointer-events-none absolute bottom-4 left-4 border border-[#c5a56d] bg-[#faf7ef]/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-[#1b3b2b]"
                      >
                        ← Kthehu prapa
                      </motion.div>
                    )}
                  </div>

                  {/* Faqja e Djathtë Statike */}
                  <div className="relative h-full">
                    <BookPageContent
                      side="right"
                      blocks={stationaryRightSp.rightBlocks}
                      pageNumber={stationaryRightSp.rightPageNumber}
                      spread={stationaryRightSp}
                      bookTitle={activeTitle}
                      getMedia={getMedia}
                    />
                    {hoverEdge === 'right' && !coverClosed && activeIdx < maxIndex && !turning && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="pointer-events-none absolute bottom-4 right-4 border border-[#c5a56d] bg-[#faf7ef]/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-[#1b3b2b]"
                      >
                        Faqja tjetër →
                      </motion.div>
                    )}
                  </div>

                  {/* Hija dinamike mbi faqet poshtë fletës që kthehet */}
                  {turning && (
                    <animated.div
                      aria-hidden="true"
                      style={{
                        transform: 'translateZ(2px)',
                        opacity: turnSpring.flipDeg.to(
                          (deg) => Math.sin((Math.abs(deg) * Math.PI) / 180) * 0.24
                        ),
                      }}
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/25 via-black/45 to-black/25"
                    />
                  )}

                  {/* FLETA 3D ME DY ANË QË KTHEHET (Me hapësirë të pastër translateZ(5px)) */}
                  {turning && (
                    <animated.div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: 0,
                        width: '50%',
                        height: '100%',
                        transformOrigin: 'left center',
                        transformStyle: 'preserve-3d',
                        willChange: 'transform',
                        transform: turnSpring.flipDeg.to(
                          (deg) => `translateZ(5px) rotateY(${deg}deg)`
                        ),
                      }}
                      className="pointer-events-none"
                    >
                      {/* Ana e Përparme */}
                      <div
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'rotateY(0deg) translateZ(1px)',
                        }}
                        className="absolute inset-0 border border-[#d3ccb8] bg-[#faf7ef] shadow-xl"
                      >
                        <BookPageContent
                          side="right"
                          blocks={turningFrontSp.rightBlocks}
                          pageNumber={turningFrontSp.rightPageNumber}
                          spread={turningFrontSp}
                          bookTitle={activeTitle}
                          getMedia={getMedia}
                          staticSnapshot
                        />
                        <animated.div
                          style={{
                            opacity: turnSpring.flipDeg.to(
                              (deg) => Math.sin((Math.abs(deg) * Math.PI) / 180) * 0.22
                            ),
                          }}
                          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-white/25"
                        />
                      </div>

                      {/* Ana e Pasme */}
                      <div
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg) translateZ(1px)',
                        }}
                        className="absolute inset-0 border border-[#d3ccb8] bg-[#faf7ef] shadow-xl"
                      >
                        <BookPageContent
                          side="left"
                          blocks={turningBackSp.leftBlocks}
                          pageNumber={turningBackSp.leftPageNumber}
                          spread={turningBackSp}
                          bookTitle={activeTitle}
                          getMedia={getMedia}
                          staticSnapshot
                        />
                        <animated.div
                          style={{
                            opacity: turnSpring.flipDeg.to(
                              (deg) => Math.sin((Math.abs(deg) * Math.PI) / 180) * 0.22
                            ),
                          }}
                          className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/30 via-transparent to-white/25"
                        />
                      </div>
                    </animated.div>
                  )}

                  {/* KAPAKU I PËRPARMË 3D I LIBRIT */}
                  <animated.div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '-10px',
                      bottom: '-10px',
                      width: 'calc(50% + 10px)',
                      transformOrigin: 'left center',
                      transformStyle: 'preserve-3d',
                      willChange: 'transform',
                      pointerEvents: coverClosed ? 'auto' : 'none',
                      transform: coverSpring.coverDeg.to(
                        (deg) => `rotateY(${deg}deg) translateZ(14px)`
                      ),
                    }}
                  >
                    <div
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(0deg)',
                      }}
                      className="absolute inset-0 flex flex-col items-center justify-between overflow-hidden rounded-r-sm border-2 border-[#122b1e] bg-[#1b3b2b] p-7 text-center text-[#f7f1e3] shadow-2xl"
                    >
                      <div className="pointer-events-none absolute inset-3 border border-[#c5a56d]/70" />
                      <div className="pointer-events-none absolute inset-4 border border-[#c5a56d]/30" />

                      <div className="relative z-10 mt-2 space-y-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#e5cf9f]">
                          Botim Arkivor Përkujtimor
                        </p>
                        <h2 className="font-serif text-3xl font-semibold leading-tight text-[#faf5e8] lg:text-4xl">
                          {activeTitle}
                        </h2>
                      </div>

                      <div className="relative z-10 my-3 aspect-[3/4] w-44 overflow-hidden border-2 border-[#c5a56d] bg-[#122b1e] p-1 shadow-lg lg:w-52">
                        <ArchivalImage
                          src={coverAsset?.url}
                          alt={coverAsset?.alt || activeTitle}
                          className="h-full w-full"
                        />
                      </div>

                      <div className="relative z-10 mb-2 space-y-2">
                        <p className="font-serif text-base italic text-[#e5cf9f]">{activeSubtitle}</p>
                        <div className="mx-auto h-px w-24 bg-[#c5a56d]/60" />
                        <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[#faf5e8]">
                          {authorName}
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                      }}
                      className="absolute inset-0 flex items-center justify-center border border-[#c5a56d]/40 bg-[#ede6d6] p-8"
                    >
                      <div className="border border-[#d3ccb8] bg-[#faf7ef] p-6 text-center">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-[#635d55]">
                          Ex Libris
                        </p>
                        <p className="mt-2 font-serif text-xl italic text-[#171614]">{activeTitle}</p>
                      </div>
                    </div>
                  </animated.div>
                </div>
              </animated.div>
            </animated.div>
          )}
        </div>
      )}

      {/* Indeksi i Kapitujve */}
      <AnimatePresence>
        {showChapters && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-28 left-1/2 z-30 w-[92vw] max-w-2xl -translate-x-1/2 border border-border bg-[#faf8f3] p-5 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-serif text-lg font-medium text-foreground">Përmbajtja e Librit</h2>
              <button
                type="button"
                onClick={() => setShowChapters(false)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Mbyll
              </button>
            </div>
            <div className="mt-3 grid max-h-56 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {activeSpreads.map((sp, i) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => {
                    jumpToSpread(i);
                    setShowChapters(false);
                  }}
                  className={`flex items-center justify-between border px-3 py-2 text-left transition-colors cursor-pointer ${
                    !coverClosed && i === safeSpreadIdx
                      ? 'border-primary bg-secondary text-foreground'
                      : 'border-border/60 hover:bg-secondary/50 text-muted-foreground'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-mono text-[10px] uppercase tracking-wider">{sp.chapterLabel}</p>
                    <p className="truncate font-serif text-sm font-medium text-foreground">
                      {sp.spreadTitle}
                    </p>
                  </div>
                  <span className="font-mono text-xs tabular-nums shrink-0">
                    {sp.leftPageNumber} - {sp.rightPageNumber}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paneli i Poshtëm i Kontrollet */}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-30 flex w-[94vw] max-w-4xl -translate-x-1/2 flex-col items-center">
        <button
          type="button"
          onClick={() => setDockOpen((v) => !v)}
          className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 border border-border bg-[#faf8f3] px-3 py-1 text-xs font-medium text-foreground shadow-xs cursor-pointer"
        >
          {dockOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          <span>{dockOpen ? 'Fshih Kontrollet' : 'Shfaq Kontrollet'}</span>
        </button>

        <AnimatePresence>
          {dockOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex w-full flex-wrap items-center justify-between gap-2.5 border border-border bg-[#faf8f3] px-4 py-3 shadow-md"
            >
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(coverClosed && !editMode) || (isMobile && !editMode && activeIdx === 0) || (editMode && safeSpreadIdx === 0)}
                  onClick={() => triggerTurn(-1)}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Mbrapa</span>
                </Button>
                {!isMobile && !editMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCoverClosed((v) => !v)}
                    className="gap-1.5"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {coverClosed ? 'Hape Librin' : 'Kopertina'}
                    </span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="hidden md:inline">
                  {editMode
                    ? 'Shkruani drejtpërdrejt në faqe dhe shtypni Ruaj Librin'
                    : coverClosed
                      ? 'Klikoni mbi kopertinë për të hapur librin'
                      : 'Tërhiqni me maus ose gisht për të kthyer faqen'}
                </span>
                <span className="font-mono tabular-nums font-medium text-foreground">
                  {coverClosed && !isMobile && !editMode
                    ? 'Kopertina'
                    : isMobile && !editMode
                      ? `Faqja ${activeIdx + 1} / ${flatPages.length}`
                      : `Fleta ${safeSpreadIdx + 1} / ${activeSpreads.length}`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {!isMobile && !editMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPerspective3D((v) => !v)}
                    className="gap-1.5"
                    title="Ndrysho këndin 3D"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {perspective3D ? 'Pamje Leximi' : 'Pamje 3D'}
                    </span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChapters((v) => !v)}
                  className="gap-1.5"
                >
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">Kapitujt</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => jumpToSpread(0)}
                  aria-label="Fillo nga faqja e parë"
                  title="Fillo nga faqja e parë"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={
                    editMode
                      ? safeSpreadIdx >= activeSpreads.length - 1
                      : !coverClosed && activeIdx >= maxIndex
                  }
                  onClick={() => triggerTurn(1)}
                  className="gap-1"
                >
                  <span>{coverClosed && !editMode ? 'Hape' : 'Përpara'}</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
