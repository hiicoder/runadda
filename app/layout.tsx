import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

const BASE_URL = "https://runadda.in"

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "RunAdda — Har Kadam Mein Masti | Running Club Patna",
    template: "%s | RunAdda",
  },
  description: "RunAdda is a vibrant running community in Patna. Join us for weekly runs, cycling, fitness events, and social service drives. Har Kadam Mein Masti!",
  keywords: [
    "RunAdda", "running club Patna", "running community India",
    "Har Kadam Mein Masti", "Patna runners", "running group Patna",
    "fitness community Patna", "cycling club Patna", "marathon Patna",
    "running events Bihar", "runadda.in",
  ],
  authors: [{ name: "RunAdda", url: BASE_URL }],
  creator: "RunAdda",
  publisher: "RunAdda",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: BASE_URL,
    siteName: "RunAdda",
    title: "RunAdda — Har Kadam Mein Masti | Running Club Patna",
    description: "Join RunAdda — Patna's most vibrant running community. Weekly runs, cycling, fitness events & social service. Har Kadam Mein Masti!",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RunAdda — Har Kadam Mein Masti",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RunAdda — Har Kadam Mein Masti",
    description: "Join RunAdda — Patna's most vibrant running community. Weekly runs, cycling, fitness events & social service.",
    images: ["/og-image.png"],
    creator: "@runadda",
  },
  alternates: {
    canonical: BASE_URL,
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  verification: {
    google: "google-site-verification=PhXrwM9WRoxmSHPksQj8vBMWQAs9C_JB-VcMy-KhMGc", // add your Google Search Console verification code here
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
