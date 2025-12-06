import "./globals.css";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { ClientProviders } from "../src/components/ClientProviders";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Fun",
  description: "Fun - Crypto-style gaming with play tokens only",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-gray-100`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}


