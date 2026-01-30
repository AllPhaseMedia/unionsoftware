import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Providers } from "@/components/providers";
import type { SessionUser } from "@/types";

export interface AppearanceSettings {
  logo_url?: string;
  logo_height?: string;
  organization_name?: string;
  menu_bg_color?: string;
  menu_text_color?: string;
  menu_accent_color?: string;
  custom_css?: string;
  custom_head_html?: string;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Get the user and organization from the database
  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: authUser.id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!dbUser) {
    redirect("/login");
  }

  // Fetch appearance settings server-side
  const settings = await prisma.systemSetting.findMany({
    where: {
      organizationId: dbUser.organizationId,
      key: {
        in: [
          "logo_url",
          "logo_height",
          "organization_name",
          "menu_bg_color",
          "menu_text_color",
          "menu_accent_color",
          "custom_css",
          "custom_head_html",
        ],
      },
    },
  });

  const appearance: AppearanceSettings = {};
  settings.forEach((s) => {
    (appearance as Record<string, string>)[s.key] = s.value;
  });

  const sessionUser: SessionUser = {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    organizationId: dbUser.organizationId,
    organization: dbUser.organization,
  };

  return (
    <Providers user={sessionUser}>
      {/* Inject custom CSS server-side to prevent flash */}
      {appearance.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: appearance.custom_css }} />
      )}
      <div className="min-h-screen bg-gray-50">
        <Sidebar appearance={appearance} />
        <div className="lg:pl-64">
          <Header appearance={appearance} />
          <main className="p-4 lg:p-6">
            <Breadcrumbs />
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
