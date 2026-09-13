import type { Metadata } from "next";
import { InLoveCounter } from "../../components/InLoveCounter";

export const metadata: Metadata = {
  title: "InLove / MKT",
  description: "Đếm từng ngày yêu của Bắc và Truyền.",
};

export default function InLovePage() {
  return <InLoveCounter />;
}
