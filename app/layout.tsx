import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist_Mono, Onest } from "next/font/google";
import "./globals.css";

// Uncommon pairing on purpose: Bricolage Grotesque has real character in
// headings and big numbers, Onest stays quiet and legible for body copy.
const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

const onest = Onest({
  variable: "--font-body",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Coach Greta",
    template: "%s | Coach Greta",
  },
  description: "Personal health habits and reminders",
  applicationName: "Coach Greta",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Coach Greta",
  },
  // icons come from app/icon.svg and app/apple-icon.png automatically
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#131316",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${onest.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
