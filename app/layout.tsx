import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { UserProfileProvider } from "@/lib/UserProfileContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "WS Next Moves",
  description: "Wealthsimple Next Moves",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.variable} font-sans antialiased`}>
        <UserProfileProvider>{children}</UserProfileProvider>
      </body>
    </html>
  );
}
