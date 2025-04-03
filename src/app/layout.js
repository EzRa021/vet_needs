"use client";

import "./globals.css";

import { ThemeProvider } from "@/components/theme-provide";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/toaster";
// import { PermissionProvider } from "@/context/PermissionContext";
import { BranchProvider } from "@/context/BranchContext";
import { SettingsProvider } from "@/context/SettingsContext";
// import { NextUIProvider } from "@nextui-org/react";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppInitializer } from "@/components/app-initializer"; // Adjust path as needed


export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {/* <QueryClientProvider client={queryClient}> */}
        {/* <NextUIProvider> */}
        <AuthProvider>
          <BranchProvider>
            {/* <PermissionProvider> */}
              <SettingsProvider>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  enableSystem
                >
                  <AppInitializer>
                    {children}
                  </AppInitializer>
                  <Toaster />
                </ThemeProvider>
              </SettingsProvider>
            {/* </PermissionProvider> */}
          </BranchProvider>
        </AuthProvider>
      </body>
    </html>
  );
}