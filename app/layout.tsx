import type { Metadata } from "next";

import "./globals.css";
import { AuthProvider } from "../providers/auth-provider";
import { AppProviders } from "./providers/app-providers";
import { Toaster } from "@/components/ui/toast/toaster";

export const metadata: Metadata = {
  title: "Only in BR Admin",
  description: "Painel administrativo Only in BR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className="font-sans antialiased">
        <AppProviders>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </AppProviders>
      </body>
    </html>
  );
}
