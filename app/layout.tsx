import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse Health | Continuous Metabolic Health & Unified Profile",
  description:
    "Your health data comes together automatically. Continuous metabolic tracking, personalized insights, and unified health telemetry with minimal manual logging.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[#DCE8EC] text-[#101A45] selection:bg-[#D5F3E7] selection:text-[#087F8C]">
        {children}
      </body>
    </html>
  );
}
