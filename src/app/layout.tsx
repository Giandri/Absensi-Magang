import type { Metadata, Viewport } from "next";
import { Space_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Wrapper from "./wrapper";

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Absensi Magang | BWS Babel",
  description: "Copyright by Giandri Aditio",
  icons: {
    icon: "/images/bws.jpg",
    shortcut: "/images/bws.jpg",
    apple: "/images/bws.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceMono.variable} font-mono antialiased`}>
        <Wrapper>{children}</Wrapper>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
