"use client";

import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { MKTScreen } from "./MKTScreen";

export function PersistentPages({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAlbumPage = pathname === "/";
  const hasMountedAlbumRef = useRef(isAlbumPage);

  if (isAlbumPage) hasMountedAlbumRef.current = true;

  return (
    <>
      {hasMountedAlbumRef.current && (
        <div hidden={!isAlbumPage} aria-hidden={!isAlbumPage}>
          <MKTScreen isActive={isAlbumPage} />
        </div>
      )}
      {!isAlbumPage && children}
    </>
  );
}
