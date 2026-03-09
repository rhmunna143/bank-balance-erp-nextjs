"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

export function AuthProvider({ children }) {
  const initialize = useAuthStore((state) => state.initialize);
  const initialized = useAuthStore((state) => state.initialized);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Middleware handles redirects — this just initializes the client-side store
  return children;
}
