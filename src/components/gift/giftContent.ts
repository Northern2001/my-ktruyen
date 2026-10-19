// Everything the gift page says lives here, so the personal parts can be
// swapped in without touching the layout. Entries marked DEMO are placeholders.

export const giftIntro = {
  eyebrow: "MKT / 20.10",
  title: "Gửi em",
  subtitle: "Một bó hoa nhỏ, từ anh.",
  openLabel: "Mở quà",
} as const;

// DEMO: replace with the real letter.
export const giftLetter = {
  greeting: "Gửi Truyền,",
  paragraphs: [
    "Anh không giỏi nói những lời hoa mỹ, nên anh để âm nhạc và những bông hoa nói giúp.",
    "Cảm ơn em vì đã đến, vì đã ở lại, và vì mỗi ngày đều làm cho những điều bình thường của anh trở nên đặc biệt.",
    "Những lúc xa nhau, anh nhớ em nhiều hơn anh dám nói. Nhớ tiếng cười, nhớ cách em nhìn anh, nhớ cả những lúc em im lặng.",
    "Chúc em 20/10 thật rực rỡ. Anh may mắn lắm khi có em.",
  ],
  signature: "— Bắc",
} as const;

export type GiftVoucher = {
  id: string;
  title: string;
  note: string;
};

// DEMO: replace with the vouchers that fit the two of you.
export const giftVouchers: readonly GiftVoucher[] = [
  { id: "date", title: "Một buổi hẹn em chọn", note: "Em chọn nơi, chọn giờ. Anh chỉ việc đến." },
  { id: "hug", title: "Một cái ôm thật lâu", note: "Đến khi nào em nói đủ thì thôi." },
  { id: "dinner", title: "Bữa tối anh nấu", note: "Em gọi món, anh cố gắng hết sức." },
  { id: "wish", title: "Một điều ước nhỏ", note: "Trong khả năng của anh, và anh sẽ thực hiện." },
  { id: "peace", title: "Một ngày anh nhường em", note: "Cả ngày hôm đó, em luôn đúng." },
] as const;

export const giftGame = {
  eyebrow: "TRÒ CHƠI NHỎ",
  title: "Tìm đôi kỷ niệm",
  hint: "Lật hai thẻ giống nhau để ghép lại. Ghép hết, anh có một điều muốn nói.",
  // DEMO: shown once every pair has been matched.
  reward: "Em tìm được hết những khoảnh khắc của mình rồi. Còn anh thì đã tìm được em từ lâu.",
  // Photos come from public/memory-media; swap in the ones that matter most.
  photos: [
    "/memory-media/IMG_7587.jpg",
    "/memory-media/IMG_7633.jpg",
    "/memory-media/IMG_3259.jpg",
    "/memory-media/IMG_3265.jpg",
    "/memory-media/IMG_7649.jpg",
    "/memory-media/IMG_7655.jpg",
  ],
} as const;

export const giftMusic = {
  title: "Món Quà",
  artist: "Dangrangto",
  url: "/music/Món quà - Dangrangto.mp3",
} as const;
