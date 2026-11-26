import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/ui/AppProviders";

export const metadata: Metadata = {
  title: "CaseWeb — The Detective Investigation Board",
  description:
    "Interactive fictional mystery investigation room. Pin evidence, organize suspects, trace timelines, and connect clues with red strings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-charcoal text-cream antialiased selection:bg-blood-red selection:text-cream">
        <div className="film-grain" aria-hidden="true" />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
