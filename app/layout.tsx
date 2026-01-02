import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
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
  title: "To-Do",
  description: "Local-first day planner for daily focus.",
  openGraph: {
    title: "To-Do | Spencer Albers",
    description: "Local-first day planner for daily focus.",
    url: "https://todo.spenceralbers.com",
    siteName: "To-Do",
    images: [
      {
        url: "https://todo.spenceralbers.com/og.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "To-Do | Spencer Albers",
    description: "Local-first day planner for daily focus.",
    images: ["https://todo.spenceralbers.com/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
