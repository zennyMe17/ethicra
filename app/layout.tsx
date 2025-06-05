// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ethicra",
  description: "Created By CodeMonks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`} // Added overflow-x-hidden
      >
        <div className="flex flex-col min-h-screen w-full h-screen overflow-x-hidden m-0 p-0 box-border">
          <header>
            <Navbar />
          </header>
          <main  className="bg-[#FAFAFC] w-full">
            {children} {/* Removed container mx-auto px-4 py-8 */}
            <Toaster />
          </main>
          <footer>
            <Footer />
          </footer>
        </div>
      </body>
    </html>
  );
}
