import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { initDb } from "@/lib/db";

initDb();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stride Coach — AI-Powered Garmin Training",
  description:
    "Connect your Garmin Connect data and get personalized AI coaching based on your goals and performance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
