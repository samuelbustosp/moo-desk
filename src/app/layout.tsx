import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource/momo-trust-display";
import "@/styles/globals.css";
import { PreferencesProvider } from "@/features/preferences";

export const metadata: Metadata = {
  title: "Moo",
  description: "Compañero personal de escritorio.",
  icons: {
    icon: [
      {
        url: "/brand/favicon-moo-dark-rounded.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/brand/favicon-moo-rounded.png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    shortcut: "/brand/favicon-moo-rounded.png",
    apple: "/brand/favicon-moo-rounded.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`dark ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className={GeistSans.className}>
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
