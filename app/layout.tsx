import type { Metadata } from "next";
import { DeferredHeadingFont } from "@/components/deferred-heading-font";
import { themeScript } from "@/lib/theme";
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <DeferredHeadingFont />
        {children}
      </body>
    </html>
  );
}
