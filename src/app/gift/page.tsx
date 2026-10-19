import type { Metadata } from "next";
import { GiftPage } from "../../components/gift/GiftPage";

export const metadata: Metadata = {
  title: "20/10 / MKT",
  description: "Một món quà nhỏ cho ngày 20/10.",
};

export default function GiftRoute() {
  return <GiftPage />;
}
