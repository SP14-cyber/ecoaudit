import type { Metadata } from "next";
import { Special_Elite, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const typewriter = Special_Elite({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-typewriter",
});

const body = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "EcoAudit — Greenwashing Whistleblower",
  description:
    "Audit product claims, labels, and sustainability reports for greenwashing, powered by Claude.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${typewriter.variable} ${body.variable} font-body`}>
        {children}
      </body>
    </html>
  );
}
