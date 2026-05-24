import type { Metadata } from "next";

import { AppProviders } from "@/components/providers/AppProviders";

import "../styles/global.css";

export const metadata: Metadata = {
  title: "RealizeMe — Turn Sketches Into Fashion",
  description: "RealizeMe — AI-powered sketch-to-fashion transformation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F8F9FA] antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
