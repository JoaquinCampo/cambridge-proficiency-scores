import "~/styles/globals.css";

import { type Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "C2 Proficiency Score Studio",
  description: "Estimate Cambridge C2 Proficiency scores from mock raw marks.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
        <body>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
