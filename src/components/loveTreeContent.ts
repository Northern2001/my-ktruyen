// Copy for the love tree on the InLove page. The tree, animals and nest change
// by themselves every few days of love, so everyone sees the same tree; watering
// is just for fun. `from` is the day count where each named stage begins.
export const loveTree = {
  eyebrow: "CÂY TÌNH YÊU",
  hint: "Cây lớn lên theo tổng số ngày mình yêu nhau, cứ 3 ngày lại đổi thay một lần, ai mở ra cũng thấy cây giống nhau. Em muốn tưới bao nhiêu cũng được.",
  waterLabel: "Tưới cây",
  stages: [
    { from: 0, name: "Hạt giống" },
    { from: 3, name: "Mầm non" },
    { from: 30, name: "Cây con" },
    { from: 102, name: "Nụ hoa" },
    { from: 183, name: "Hoa nở" },
    { from: 365, name: "Cây đại thụ" },
  ],
  // DEMO: one note per watering, in order.
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
