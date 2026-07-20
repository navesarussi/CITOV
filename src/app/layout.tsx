import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "שידוך — השמה חכמה",
  description: "סוכן השמה שמכיר אתכם לעומק ומשדך בלי חיפוש",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
