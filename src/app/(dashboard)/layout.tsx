import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CustomCodeInjector } from "@/components/layout/custom-code-injector";
import { Providers } from "@/components/providers";
import type { SessionUser } from "@/types";

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
      <CustomCodeInjector />
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:pl-64">
          <Header />
          <main className="p-4 lg:p-6">
            <Breadcrumbs />
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
