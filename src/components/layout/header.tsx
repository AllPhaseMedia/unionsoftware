"use client";

import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Bell, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileSidebar } from "./mobile-sidebar";

interface AppearanceSettings {
  logo_url?: string;
  logo_height?: string;
  organization_name?: string;
  menu_bg_color?: string;
  menu_text_color?: string;
  menu_accent_color?: string;
}

interface HeaderProps {
  appearance?: AppearanceSettings;
}

export function Header({ appearance }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-white px-4 lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <MobileSidebar appearance={appearance} />
        </SheetContent>
      </Sheet>

      <div className="flex-1">
        <OrganizationSwitcher
          afterCreateOrganizationUrl="/"
          afterLeaveOrganizationUrl="/create-organization"
          afterSelectOrganizationUrl="/"
          appearance={{
            elements: {
              rootBox: "flex items-center",
              organizationSwitcherTrigger:
                "py-2 px-3 rounded-md border border-gray-200 hover:bg-gray-50",
            },
          }}
        />
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>

        <UserButton
          afterSignOutUrl="/sign-in"
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </div>
    </header>
  );
}
