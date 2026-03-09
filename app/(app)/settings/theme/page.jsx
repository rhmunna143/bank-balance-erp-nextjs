"use client";

import { useTheme } from "@/hooks/useTheme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Palette, Check } from "lucide-react";

const THEMES = [
  {
    id: "default",
    name: "Default Blue",
    description: "Professional blue theme",
    primaryColor: "#2563eb",
    accentColor: "#7c3aed",
  },
  {
    id: "bank-asia",
    name: "Bank Asia Green",
    description: "Green theme inspired by Bank Asia",
    primaryColor: "#059669",
    accentColor: "#0d9488",
  },
];

export default function ThemeSettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Theme Settings</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Customize the look and feel of your workspace
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {THEMES.map((t) => (
          <Card
            key={t.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              theme === t.id ? "ring-2 ring-[var(--color-primary)]" : ""
            }`}
            onClick={() => setTheme(t.id)}
          >
            <CardContent className="py-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: t.primaryColor }}
                  >
                    <Palette className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium">{t.name}</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {t.description}
                    </p>
                  </div>
                </div>
                {theme === t.id && (
                  <div className="bg-[var(--color-primary)] text-white rounded-full p-1">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>
              {/* Preview */}
              <div className="mt-4 flex gap-2">
                <div
                  className="w-8 h-8 rounded"
                  style={{ backgroundColor: t.primaryColor }}
                  title="Primary"
                />
                <div
                  className="w-8 h-8 rounded"
                  style={{ backgroundColor: t.accentColor }}
                  title="Accent"
                />
                <div
                  className="w-8 h-8 rounded bg-[var(--color-surface)] border border-[var(--color-border)]"
                  title="Surface"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
