import type { Metadata } from "next";
import { Rajdhani, Sora } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-rajdhani",
});

export const metadata: Metadata = {
  title: "Sistema de Gestion - Taller GNC",
  description: "Sistema integral para la gestion de talleres especializados en GNC",
  manifest: "/manifest.json",
  themeColor: "#f97316",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Taller GNC",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${sora.variable} ${rajdhani.variable}`}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
