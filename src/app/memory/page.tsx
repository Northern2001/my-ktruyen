import type { Metadata } from "next";
import { MemoryGallery } from "../../components/MemoryGallery";

export const metadata: Metadata = {
  title: "Memory / MKT",
  description: "MKT memory archive",
};

export default function MemoryPage() {
  return <MemoryGallery />;
}
