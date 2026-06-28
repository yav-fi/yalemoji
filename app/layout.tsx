import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YaleMoji",
  description: "Join the YaleMoji campus waitlist."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
