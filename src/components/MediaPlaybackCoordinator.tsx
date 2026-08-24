"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

type MediaPlaybackContextValue = {
  albumAudioRef: RefObject<HTMLAudioElement | null>;
  beginMediaPlayback: (sourceId: string) => void;
  endMediaPlayback: (sourceId: string) => void;
};

const MediaPlaybackContext = createContext<MediaPlaybackContextValue | null>(null);

export function MediaPlaybackCoordinator({ children }: { children: ReactNode }) {
  const albumAudioRef = useRef<HTMLAudioElement>(null);
  const activeSourcesRef = useRef(new Set<string>());
  const shouldResumeAlbumRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);

  const beginMediaPlayback = useCallback((sourceId: string) => {
    if (activeSourcesRef.current.has(sourceId)) return;

    const hadPendingResume = resumeTimerRef.current !== null;
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }

    const isFirstSource = activeSourcesRef.current.size === 0;
    activeSourcesRef.current.add(sourceId);

    if (!isFirstSource || hadPendingResume) return;

    const albumAudio = albumAudioRef.current;
    shouldResumeAlbumRef.current = Boolean(
      albumAudio && !albumAudio.paused && !albumAudio.ended,
    );

    if (shouldResumeAlbumRef.current) albumAudio?.pause();
  }, []);

  const endMediaPlayback = useCallback((sourceId: string) => {
    if (!activeSourcesRef.current.delete(sourceId)) return;
    if (activeSourcesRef.current.size > 0 || resumeTimerRef.current !== null) return;

    // Defer the resume so switching tracks does not briefly play both sources.
    resumeTimerRef.current = window.setTimeout(() => {
      resumeTimerRef.current = null;
      if (activeSourcesRef.current.size > 0) return;

      const shouldResume = shouldResumeAlbumRef.current;
      shouldResumeAlbumRef.current = false;
      const albumAudio = albumAudioRef.current;

      if (shouldResume && albumAudio?.paused && !albumAudio.ended) {
        void albumAudio.play().catch(() => {});
      }
    }, 0);
  }, []);

  useEffect(() => () => {
    if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
  }, []);

  const value = useMemo(() => ({
    albumAudioRef,
    beginMediaPlayback,
    endMediaPlayback,
  }), [beginMediaPlayback, endMediaPlayback]);

  return (
    <MediaPlaybackContext.Provider value={value}>
      {children}
    </MediaPlaybackContext.Provider>
  );
}

export function useMediaPlayback() {
  const context = useContext(MediaPlaybackContext);
  if (!context) {
    throw new Error("useMediaPlayback must be used inside MediaPlaybackCoordinator.");
  }
  return context;
}
