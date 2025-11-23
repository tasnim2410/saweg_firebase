import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saweg",
  description: "Register now for early access to the Saweg delivery app",
  icons: {
    icon: "/images/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
