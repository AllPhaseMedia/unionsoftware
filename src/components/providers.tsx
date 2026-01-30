"use client";

import { OrganizationContext } from "@/hooks/use-organization";
import type { SessionUser } from "@/types";
import { Toaster } from "@/components/ui/sonner";

interface ProvidersProps {
  children: React.ReactNode;
  user: SessionUser | null;
}

export function Providers({ children, user }: ProvidersProps) {
  return (
    <OrganizationContext.Provider value={{ user, loading: false }}>
      {children}
      <Toaster />
    </OrganizationContext.Provider>
  );
}
