import { stat } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { Mp3Library } from "../../components/Mp3Library";
import type { Mp3Track } from "../../components/Mp3Library";
import { sitePath } from "../../lib/site-path";

export const metadata: Metadata = {
  title: "Voice Notes / MKT",
  description: "Những lá thư được MKT giữ lại bằng giọng nói.",
};

type VoiceDetails = Pick<Mp3Track, "fileName" | "title" | "artist" | "imageUrl" | "order">;

const voiceDetails: readonly VoiceDetails[] = [
  {
    fileName: "anh-yeu-em.m4a",
    title: "Anh yêu em",
    artist: "VOICE NOTE",
    imageUrl: "/images/mkt/cover-083.jpg",
    order: 0,
  },
  {
    fileName: "chuc-mung-sinh-nhat-be-yeu.m4a",
    title: "Chúc mừng sinh nhật bé yêu",
    artist: "VOICE NOTE",
    imageUrl: "/images/mkt/IMG_3265.jpg",
    order: 1,
  },
  {
    fileName: "rat-may-man-khi-anh-quen-duoc-em.m4a",
    title: "Rất may mắn khi anh quen được em",
    artist: "VOICE NOTE",
    imageUrl: "/images/mkt/cover-051.jpg",
    order: 2,
  },
  {
    fileName: "anh-nho-em.m4a",
    title: "Anh nhớ em",
    artist: "VOICE NOTE",
    imageUrl: "/images/mkt/IMG_7649.jpg",
    order: 3,
  },
];

async function getMp3Tracks(): Promise<Mp3Track[]> {
  const voiceDirectory = path.join(process.cwd(), "public", "voice");

  const tracks = await Promise.all(voiceDetails.map(async (details) => {
    const fileStats = await stat(path.join(voiceDirectory, details.fileName));

    return {
      ...details,
      url: sitePath(`/voice/${details.fileName}`),
      sizeBytes: fileStats.size,
      imageUrl: sitePath(details.imageUrl),
    };
  }));

  return tracks.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "vi"));
}

export default async function Mp3Page() {
  const tracks = await getMp3Tracks();
  return <Mp3Library tracks={tracks} />;
}
