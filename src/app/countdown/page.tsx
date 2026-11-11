import type { Metadata } from "next";
import { Countdown } from "../../components/countdown/Countdown";

export const metadata: Metadata = {
  title: "Countdown / MKT",
  description: "Đếm ngược đến ngày gặp nhau, Tết Dương lịch.",
};

export default function Page() {
  return <Countdown />;
}
