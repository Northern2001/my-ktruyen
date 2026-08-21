import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { Mp3Library } from "../../components/Mp3Library";
import type { Mp3Track } from "../../components/Mp3Library";
import { sitePath } from "../../lib/site-path";

export const metadata: Metadata = {
  title: "MP3 / MKT",
  description: "Danh sách MP3 của MKT",
};

type TrackDetails = Pick<Mp3Track, "title" | "artist" | "imageUrl"> & {
  order: number;
};

const trackDetails: Record<string, TrackDetails> = {
  "SOS.mp3": { order: 0, title: "SOS", artist: "ZIK, 邹沛沛", imageUrl: "/images/mkt/IMG_3259.jpg" },
  "biển đảo và em.mp3": { order: 1, title: "Biển, Đảo Và Em", artist: "Mã Dã (Crabbit)", imageUrl: "/images/mkt/IMG_3265.jpg" },
  "不完整的心.mp3": { order: 2, title: "不完整的心", artist: "邹沛沛", imageUrl: "/images/mkt/IMG_7587.jpg" },
  "底牌.mp3": { order: 3, title: "底牌", artist: "Max李玄, 邹沛沛", imageUrl: "/images/mkt/IMG_7633.jpg" },
  "惦念你.mp3": { order: 4, title: "惦念你", artist: "邹沛沛", imageUrl: "/images/mkt/IMG_7649.jpg" },
  "是否太滥情.mp3": { order: 5, title: "是否太滥情", artist: "邢益豪, 邹沛沛", imageUrl: "/images/mkt/cover-001.jpg" },
  "月光下曖昧.mp3": { order: 6, title: "月光下曖昧", artist: "邹沛沛", imageUrl: "/images/mkt/cover-008.jpg" },
  "梦臆.mp3": { order: 7, title: "梦臆", artist: "邹沛沛", imageUrl: "/images/mkt/cover-019.jpg" },
  "沉溺（你让我的心不再结冰）.mp3": { order: 8, title: "沉溺（你让我的心不再结冰）", artist: "邹沛沛, Pank", imageUrl: "/images/mkt/cover-021.jpg" },
  "沦陷（Sink Into）.mp3": { order: 9, title: "沦陷（Sink Into）", artist: "Juggshots", imageUrl: "/images/mkt/cover-026.jpg" },
  "漏拍情話.mp3": { order: 10, title: "漏拍情話", artist: "邹沛沛", imageUrl: "/images/mkt/cover-028.jpg" },
  "漫步香港1999.mp3": { order: 11, title: "漫步香港1999", artist: "白浩贤BlueC", imageUrl: "/images/mkt/cover-034.jpg" },
  "空白.mp3": { order: 12, title: "空白", artist: "Pank, 羅凱元", imageUrl: "/images/mkt/cover-040.jpg" },
  "红线.mp3": { order: 13, title: "红线", artist: "邹沛沛, Pank", imageUrl: "/images/mkt/cover-051.jpg" },
  "slippery.mp3": { order: 14, title: "Slippery", artist: "RPT MCK, Tùng Dương", imageUrl: "/images/mkt/cover-064.jpg" },
  "intepol.mp3": { order: 15, title: "Intepol", artist: "RPT MCK", imageUrl: "/images/mkt/cover-083.jpg" },
  "tay-thi.mp3": { order: 16, title: "Tây Thi", artist: "RPT MCK", imageUrl: "/images/mkt/cover-084.jpg" },
  "hut-va-hut.mp3": { order: 17, title: "Hút Và Hút", artist: "RPT MCK", imageUrl: "/images/mkt/cover-085.jpg" },
  "dua-chua.mp3": { order: 18, title: "Dưa Chua", artist: "RPT MCK", imageUrl: "/images/mkt/cover-086.jpg" },
  "xa-xoi.mp3": { order: 19, title: "Xa Xôi", artist: "RPT MCK, Obito", imageUrl: "/images/mkt/cover-087.jpg" },
  "che-phu.mp3": { order: 20, title: "Che Phủ", artist: "RPT MCK", imageUrl: "/images/mkt/cover-088.jpg" },
  "oanh-m-=-thuoc.mp3": { order: 21, title: "Oanh M = Thuoc", artist: "RPT MCK", imageUrl: "/images/mkt/cover-090.jpg" },
  "ghet-xog-lai-thik.mp3": { order: 22, title: "Ghet Xog Lai Thik", artist: "RPT MCK", imageUrl: "/images/mkt/cover-092.jpg" },
  "nhin-ke-thu-cua-tao.mp3": { order: 23, title: "Nhìn Kẻ Thù Của Tao", artist: "RPT MCK", imageUrl: "/images/mkt/cover-093.jpg" },
  "envy.mp3": { order: 24, title: "Envy", artist: "RPT MCK, THANHDRAW", imageUrl: "/images/mkt/cover-095.jpg" },
  "cam-on.mp3": { order: 25, title: "Cảm Ơn", artist: "RPT MCK", imageUrl: "/images/mkt/cover-096.jpg" },
  "khong-can-lo-cho-tao.mp3": { order: 26, title: "Không Cần Lo Cho Tao", artist: "RPT MCK", imageUrl: "/images/mkt/cover-098.jpg" },
  "huh.mp3": { order: 27, title: "Huh", artist: "RPT MCK, RPT Orijinn, THANHDRAW", imageUrl: "/images/mkt/cover-099.jpg" },
  "nguyen-van-muoi.mp3": { order: 28, title: "Nguyễn Văn Mười", artist: "RPT MCK", imageUrl: "/images/mkt/cover-100.jpg" },
  "thit-lon.mp3": { order: 29, title: "Thịt Lợn", artist: "RPT MCK", imageUrl: "/images/mkt/cover-101.jpg" },
};

async function getMp3Tracks(): Promise<Mp3Track[]> {
  const musicDirectory = path.join(process.cwd(), "public", "music");
  const entries = await readdir(musicDirectory, { withFileTypes: true });
  const mp3Files = entries.filter((entry) => (
    entry.isFile()
    && entry.name.toLowerCase().endsWith(".mp3")
    && trackDetails[entry.name.normalize("NFC")] != null
  ));

  const tracks = await Promise.all(mp3Files.map(async (entry) => {
    const details = trackDetails[entry.name.normalize("NFC")];
    const fileStats = await stat(path.join(musicDirectory, entry.name));

    return {
      fileName: entry.name,
      url: sitePath(`/music/${encodeURIComponent(entry.name)}`),
      sizeBytes: fileStats.size,
      title: details.title,
      artist: details.artist,
      imageUrl: sitePath(details.imageUrl),
      order: details.order,
    };
  }));

  return tracks.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "vi"));
}

export default async function Mp3Page() {
  const tracks = await getMp3Tracks();
  return <Mp3Library tracks={tracks} />;
}
