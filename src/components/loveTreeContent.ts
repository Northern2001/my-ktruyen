// Copy for the love tree on the InLove page. The tree grows by itself with the
// days in love; watering it once a day makes its buds bloom. `from` is the
// number of days together that unlocks each stage.
export const loveTree = {
  eyebrow: "CÂY TÌNH YÊU",
  hint: "Cây lớn lên theo từng ngày mình yêu nhau. Mỗi ngày em tưới một lần: hoa nở thêm, chim và các bạn nhỏ cũng vui hơn.",
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
