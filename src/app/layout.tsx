import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NGine - MVP Starter Template",
  description: "Production-ready Next.js starter with authentication, database, and payments",
  keywords: ["Next.js", "Clerk", "Drizzle", "Neon", "Stripe", "Lemon Squeezy", "TypeScript"],
};

// Check if Clerk is configured
const isClerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const body = (
    <body
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      {children}
      <Toaster />
    </body>
  );

  // If Clerk is not configured, render without ClerkProvider
  // This allows the build to succeed without Clerk keys
  if (!isClerkConfigured) {
    return (
      <html lang="en">
        {body}
      </html>
    );
  }

  return (
    <ClerkProvider>
      <html lang="en">
        {body}
      </html>
    </ClerkProvider>
  );
}
