import "@/app/globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  try {
    const supabase = await createClient();
    const { data: bank } = await supabase
      .from("banks")
      .select("id, name")
      .limit(1)
      .single();

    if (bank) {
      const { data: settings } = await supabase
        .from("site_settings")
        .select("site_name, favicon_url, meta_title, meta_description")
        .eq("bank_id", bank.id)
        .single();

      if (settings) {
        return {
          title: settings.meta_title || settings.site_name || "AgentBank ERP",
          description: settings.meta_description || "Multi-tenant agent banking operations system",
          icons: {
            icon: settings.favicon_url || "/favicon.svg",
          },
        };
      }
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <ThemeProvider>
            {children}
            <ToastProvider />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
