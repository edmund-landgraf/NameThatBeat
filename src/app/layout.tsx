import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "NameThatBeat",
  description:
    "Solo music ID practice and human verification for clips that Shazam-style apps fail to recognize"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
