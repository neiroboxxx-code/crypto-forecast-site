import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { MaintenanceBanner } from "@/components/ui/maintenance-banner";
import { PwaRegister } from "@/components/ui/pwa-register";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Crypto Analytics",
  description: "Инструмент для анализа криптовалютных рынков",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Crypto Analytics",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: "/icons/favicon-32.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${geist.variable} h-full`}>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body>
        <PwaRegister />
        <MaintenanceBanner />
        {children}
      </body>
    </html>
  );
}