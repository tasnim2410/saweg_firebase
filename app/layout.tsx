import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.saweg.app"),
  title: "Saweg",
  description: "Register now for early access to the Saweg delivery app",
  openGraph: {
    title: "Saweg",
    description: "Register now for early access to the Saweg delivery app",
    images: [{ url: "/images/logo.png" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Saweg",
    description: "Register now for early access to the Saweg delivery app",
    images: ["/images/logo.png"],
  },
  icons: {
    icon: "/images/browser_icon.png", // Browser tab icon (transparent, no background)
    shortcut: "/images/browser_icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
