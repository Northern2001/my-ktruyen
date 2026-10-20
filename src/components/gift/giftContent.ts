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

export const giftVouchers: readonly GiftVoucher[] = [
  { id: "item", title: "Một món đồ em muốn", note: "Em thích món gì, anh mua tặng em." },
  { id: "cook", title: "Anh tự nấu cho em một bữa", note: "Em gọi món, anh vào bếp." },
  { id: "stay-home", title: "Một ngày chỉ ở nhà cùng nhau", note: "Không đi đâu cả, chỉ có hai đứa mình." },
  { id: "trip", title: "Đi một nơi em chọn", note: "Em chọn nơi và tự sắp xếp, anh đi theo." },
  { id: "eat-out", title: "Đi ăn ở nơi em chọn", note: "Em muốn ăn ở đâu, mình đến đó." },
] as const;

export const giftGame = {
  eyebrow: "TRÒ CHƠI NHỎ",
  title: "Tìm đôi kỷ niệm",
  hint: "Lật hai thẻ giống nhau để ghép lại. Ghép hết, anh có một điều muốn nói.",
  // DEMO: shown once every pair has been matched.
  reward: "Em tìm được hết những khoảnh khắc của mình rồi. Còn anh thì đã tìm được em từ lâu.",
  // Extra prize unlocked once every pair has been matched.
  bonusLabel: "PHẦN THƯỞNG THÊM",
  bonus: "Thêm một phần thưởng bất kỳ em muốn. Em muốn gì cũng được, cứ nói với anh.",
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

// The tree grows by itself with the days in love; watering it once a day makes
// its buds bloom. `from` is the number of days together that unlocks the stage.
export const giftTree = {
  eyebrow: "CÂY TÌNH YÊU",
  title: "Cây của hai đứa mình",
  hint: "Cây lớn lên theo từng ngày mình yêu nhau. Mỗi ngày em tưới một lần, một nụ hoa sẽ nở.",
  waterLabel: "Tưới cây",
  wateredLabel: "Hôm nay em tưới rồi",
  stages: [
    { from: 0, name: "Hạt giống" },
    { from: 7, name: "Mầm non" },
    { from: 30, name: "Cây con" },
    { from: 100, name: "Nụ hoa" },
    { from: 200, name: "Hoa nở" },
    { from: 365, name: "Cây đại thụ" },
  ],
  // DEMO: one note appears per watering, in order.
  notes: [
    "Cảm ơn em đã đến bên anh.",
    "Hôm nay anh nhớ em nhiều hơn hôm qua.",
    "Có em, ngày nào cũng đáng nhớ.",
    "Anh thích cách em cười.",
    "Mình cùng lớn lên nhé.",
    "Anh yêu em, nhiều hơn anh nói.",
    "Em là điều đẹp nhất của anh.",
    "Mỗi ngày bên em đều là một món quà.",
    "Cứ ở cạnh anh thêm thật lâu nhé.",
    "Anh luôn ở đây, đợi em.",
    "Em làm trái tim anh nhẹ đi.",
    "Hôm nay em đã ăn ngon chưa?",
    "Anh tự hào vì có em.",
    "Mình sẽ còn nhiều mùa hoa nữa.",
  ],
} as const;
