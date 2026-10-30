import type { Metadata } from "next";
import Script from "next/script";
import { themeBootScript } from "./theme-script";
import "./globals.css";
import "./templates.css";
import "./theme.css";

export const metadata: Metadata = {
  title: "Sukoon Studio — Content Workspace",
  description: "A calm workspace for researching, creating, and reviewing campaign content.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script id="theme-boot" strategy="beforeInteractive">{themeBootScript}</Script>
        {children}
      </body>
    </html>
  );
}
