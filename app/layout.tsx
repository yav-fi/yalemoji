import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YaleMoji",
  description: "Build your YaleMoji avatar for CourseTable."
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
