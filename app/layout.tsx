import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import TopNavigation from "./_components/top-navigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GridPilot | Firebase Trading Bot Platform",
  description:
    "A Firebase-powered futures trading bot platform with dashboard, settings, and 2% per-trade fee wallet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TopNavigation />
        {children}
      </body>
    </html>
  );
}
