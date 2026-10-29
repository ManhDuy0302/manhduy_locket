import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";

import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: "Locket",
  description: "Share a little glimpse of your day with your best friends.",
  applicationName: "Locket",
  appleWebApp: {
    capable: true,
    title: "Locket",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "Locket",
    title: "Locket",
    description: "Share a little glimpse of your day with your best friends.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1792,
        height: 1024,
        alt: "Locket",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Locket",
    description: "Share a little glimpse of your day with your best friends.",
    images: ["/twitter-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
