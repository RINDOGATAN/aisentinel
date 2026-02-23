"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect } from "react";
import { brand } from "@/config/brand";

interface ThemeProviderProps {
  children: React.ReactNode;
}

function BrandColorInjector() {
  useEffect(() => {
    const root = document.documentElement;

    if (process.env.NEXT_PUBLIC_COLOR_PRIMARY) {
      root.style.setProperty("--primary", brand.colors.primary);
      root.style.setProperty("--accent", brand.colors.accent);
      root.style.setProperty("--ring", brand.colors.primary);
      root.style.setProperty("--chart-1", brand.colors.primary);
      root.style.setProperty("--sidebar-primary", brand.colors.primary);
      root.style.setProperty("--sidebar-ring", brand.colors.primary);
    }

    if (process.env.NEXT_PUBLIC_COLOR_PRIMARY_FG) {
      root.style.setProperty("--primary-foreground", brand.colors.primaryForeground);
      root.style.setProperty("--accent-foreground", brand.colors.primaryForeground);
      root.style.setProperty("--sidebar-primary-foreground", brand.colors.primaryForeground);
    }

    if (process.env.NEXT_PUBLIC_COLOR_BACKGROUND) {
      root.style.setProperty("--background", brand.colors.background);
    }

    if (process.env.NEXT_PUBLIC_COLOR_CARD) {
      root.style.setProperty("--card", brand.colors.card);
      root.style.setProperty("--popover", brand.colors.card);
      root.style.setProperty("--secondary", brand.colors.card);
      root.style.setProperty("--muted", brand.colors.card);
      root.style.setProperty("--input", brand.colors.card);
      root.style.setProperty("--sidebar", brand.colors.card);
      root.style.setProperty("--sidebar-accent", brand.colors.card);
    }
  }, []);

  return null;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <BrandColorInjector />
      {children}
    </NextThemesProvider>
  );
}
