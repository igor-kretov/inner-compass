import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { ThemeProvider, ThemeScript } from "@/components/theme-provider";
import { AppStoreProvider } from "@/lib/app-store";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Inner Compass",
    template: "%s · Inner Compass",
  },
  description:
    "Ein ruhiger, lokaler Begleiter für Fokus, Tagesstruktur und bewusste Rückkehr.",
  applicationName: "Inner Compass",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/inner-compass.svg", type: "image/svg+xml" },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Inner Compass",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f2ec" },
    { media: "(prefers-color-scheme: dark)", color: "#101816" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="de" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        <ThemeProvider>
          <ServiceWorkerRegistration />
          <AppStoreProvider>{children}</AppStoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
