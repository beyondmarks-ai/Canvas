import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flowspace — Workflow canvas",
  description: "An infinite draggable workflow canvas",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
