"use client";

import { createContext, useContext } from "react";
import type { SessionUser } from "@/types";

interface OrganizationContextType {
  user: SessionUser | null;
  loading: boolean;
}

export const OrganizationContext = createContext<OrganizationContextType>({
  user: null,
  loading: true,
});

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
