import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ClerkLoaded, ClerkProvider, GoogleOneTap } from "@clerk/nextjs";
import Script from "next/script";
import AnimatedMount from "./_components/AnimatedMount";

const inter = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Course Generator",
  description:
    "AI Course Generator is a platform that allows users to easily create and generate educational courses using artificial intelligence. By simply entering course details like name, duration, number of chapters, and specifying if videos are included, AI generates the entire course structure along with relevant YouTube videos for each chapter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <ClerkProvider>
        <GoogleOneTap />
        <body className={inter.className}>
          <Script
            src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js"
            strategy="afterInteractive"
          />
          <ClerkLoaded>
            <div
              id="page-root"
              style={{ opacity: 0, transform: "translateY(6px)" }}
            >
              {children}
            </div>
            <AnimatedMount />
          </ClerkLoaded>
        </body>
      </ClerkProvider>
    </html>
  );
}
