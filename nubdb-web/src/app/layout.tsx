import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "NubDT — High-Performance Database Console",
  description: "Manage and interact with your NubDT database instances from a beautiful web interface.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <div className="bg-grid" />
        <div className="bg-glow" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
