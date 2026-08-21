"use client";

import { usePathname } from "next/navigation";
import { BirthdayIntro } from "./BirthdayIntro";

export function BirthdayIntroRoute() {
  const pathname = usePathname();

  return pathname === "/" ? <BirthdayIntro /> : null;
}
