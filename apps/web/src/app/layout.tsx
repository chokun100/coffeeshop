import "../index.css";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import Sidebar from "@/components/sidebar";
import { StoreSettingsProvider } from "@/store/store-settings";

export const metadata: Metadata = {
  title: "",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="light">
      <body className="min-h-dvh bg-base-100 text-base-content antialiased">
        <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false} forcedTheme="light">
          <StoreSettingsProvider>
            <div className="min-h-dvh flex">
              <Sidebar />
              <main className="flex-1">
                {children}
              </main>
            </div>
          </StoreSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
