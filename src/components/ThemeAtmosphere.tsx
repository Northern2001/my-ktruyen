"use client";

import type { CSSProperties } from "react";
import { useEffect } from "react";

type StarStyle = CSSProperties & {
  "--star-delay": string;
  "--star-duration": string;
  "--star-left": string;
  "--star-size": string;
  "--star-top": string;
};

const stars = Array.from({ length: 48 }, (_, index): StarStyle => ({
  "--star-delay": `-${(index * 13) % 19}s`,
  "--star-duration": `${9 + (index % 7) * 2}s`,
  "--star-left": `${(index * 37 + 7) % 101}%`,
  "--star-size": `${index % 9 === 0 ? 2 : 1}px`,
  "--star-top": `${(index * 61 + 11) % 97}%`,
}));

export function ThemeAtmosphere() {
  useEffect(() => {
    const root = document.documentElement;
    let animationFrame = 0;

    const updateParallax = (event: PointerEvent) => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const horizontal = (event.clientX / window.innerWidth - 0.5) * 2;
        const vertical = (event.clientY / window.innerHeight - 0.5) * 2;
        root.style.setProperty("--theme-parallax-x", `${horizontal * 6}px`);
        root.style.setProperty("--theme-parallax-y", `${vertical * 6}px`);
      });
    };

    const resetParallax = () => {
      root.style.setProperty("--theme-parallax-x", "0px");
      root.style.setProperty("--theme-parallax-y", "0px");
    };

    window.addEventListener("pointermove", updateParallax, { passive: true });
    document.documentElement.addEventListener("pointerleave", resetParallax);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointermove", updateParallax);
      document.documentElement.removeEventListener("pointerleave", resetParallax);
    };
  }, []);

  return (
    <div className="theme-atmosphere" aria-hidden="true">
      <div className="theme-atmosphere__grid" />
      <div className="theme-atmosphere__stars">
        {stars.map((style, index) => <span key={index} style={style} />)}
      </div>
    </div>
  );
}
