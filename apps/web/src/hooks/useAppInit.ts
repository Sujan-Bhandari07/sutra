"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";

/** Loads the workspace (user, conversations, agents, integrations) once. */
export function useAppInit() {
  const init = useAppStore((s) => s.init);
  useEffect(() => {
    void init();
  }, [init]);
}
