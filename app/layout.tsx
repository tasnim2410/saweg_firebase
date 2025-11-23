import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App Pre-Launch - Coming Soon",
  description: "Register now for early access to our revolutionary delivery app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
