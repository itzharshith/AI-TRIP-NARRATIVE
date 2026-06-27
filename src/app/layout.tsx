import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/client";

export const metadata: Metadata = {
  title: "Manivtha Tours | AI Trip Narrative Generator",
  description: "Transform your trip memories into immersive AI-crafted narratives. Manivtha Tours & Travels, Hyderabad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Work+Sans:wght@400;500;600&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-on-surface font-sans selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
