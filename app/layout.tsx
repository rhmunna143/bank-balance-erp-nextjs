import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import prisma from "@/lib/prisma";

export async function generateMetadata() {
  try {
    const bank = await prisma.bank.findFirst({
      select: { id: true, name: true, logoUrl: true }
    });

    if (bank) {
      return {
        title: `${bank.name} - AgentBank ERP`,
        description: "Multi-tenant agent banking operations system",
        icons: {
          icon: bank.logoUrl || "/favicon.svg",
        },
      };
    }
  } catch {
    // Fall through to defaults
  }

  return {
    title: "AgentBank ERP",
    description: "Multi-tenant agent banking operations system",
    icons: { icon: "/favicon.svg" },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body suppressHydrationWarning>
          <ThemeProvider>
            {children}
            <ToastProvider />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
