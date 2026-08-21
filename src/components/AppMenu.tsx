"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const menuItems = [
  { href: "/", label: "Album", index: "01" },
  { href: "/memory/", label: "Memory", index: "02" },
  { href: "/mp3/", label: "MP3", index: "03" },
] as const;

export function AppMenu() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    closeButtonRef.current?.focus();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/$/, ""));

  return (
    <div className={`app-menu ${isOpen ? "is-open" : ""}`}>
      <button
        className="app-menu__trigger"
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Mở menu"
        aria-expanded={isOpen}
        aria-controls="app-menu-panel"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <button
        className="app-menu__backdrop"
        type="button"
        onClick={() => setIsOpen(false)}
        aria-label="Đóng menu"
        tabIndex={isOpen ? 0 : -1}
      />

      <aside
        id="app-menu-panel"
        className="app-menu__panel"
        aria-label="Điều hướng chính"
        aria-hidden={!isOpen}
      >
        <header className="app-menu__header">
          <span className="app-menu__brand">MKT</span>
          <button
            ref={closeButtonRef}
            className="app-menu__close"
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Đóng menu"
            tabIndex={isOpen ? 0 : -1}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <nav className="app-menu__nav">
          {menuItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                className={`app-menu__link ${active ? "is-active" : ""}`}
                href={item.href}
                aria-current={active ? "page" : undefined}
                tabIndex={isOpen ? 0 : -1}
                onClick={() => setIsOpen(false)}
              >
                <span className="app-menu__index">{item.index}</span>
                <span>{item.label}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14m-5-5 5 5-5 5" />
                </svg>
              </Link>
            );
          })}
        </nav>

        <span className="app-menu__footer">FOR MY LOVE</span>
      </aside>
    </div>
  );
}
