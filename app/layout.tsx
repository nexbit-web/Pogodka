import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Header } from "@/components/shared/header";
import { sfuiDisplay } from "./fonts";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
export const metadata: Metadata = {
  title: "Pogodka",
  description:
    "Точний прогноз погоди в Україні: температура, опади, вітер, сонце та хмарність у містах і селах України з погодинним та 7-денним прогнозом.",

  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", type: "image/png" },
      { url: "/favicon-16x16.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    other: [
      {
        rel: "icon",
        url: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        rel: "icon",
        url: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },

  openGraph: {
    type: "website",
    locale: "uk_UA",
    url: "https://pogodka.ua",
    siteName: "Pogodka",
    title: "Pogodka — точний прогноз погоди в Україні",
    description:
      "Pogodka: міста і села України, температура, опади, вітер, хмарність, погодинний та 7-денний прогноз онлайн.",
    images: [
      {
        url: "/og/main-weather.jpg",
        width: 1200,
        height: 630,
        alt: "Погода в Україні — Pogodka",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Pogodka — точний прогноз погоди в Україні",
    description:
      "Pogodka: міста і села України, температура, опади, вітер, хмарність, погодинний та 7-денний прогноз онлайн.",
    images: ["/og/main-weather.jpg"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  category: "weather",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sfuiDisplay.variable} antialiased `}>
        <Toaster />
        <NextTopLoader
          color="var(--primary)"
          height={2}
          showSpinner={false}
          easing="ease"
          speed={200}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
