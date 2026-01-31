"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  ChevronDown,
  Building2,
  FormInput,
  FileType,
  Mail,
  UserCog,
  Palette,
  Briefcase,
  Send,
  User,
} from "lucide-react";
import { useState } from "react";
import { SheetClose } from "@/components/ui/sheet";

interface AppearanceSettings {
  logo_url?: string;
  logo_height?: string;
  organization_name?: string;
  menu_bg_color?: string;
  menu_text_color?: string;
  menu_accent_color?: string;
}

interface MobileSidebarProps {
  appearance?: AppearanceSettings;
}

export function MobileSidebar({ appearance = {} }: MobileSidebarProps) {
  const pathname = usePathname();
  const [settingsExpanded, setSettingsExpanded] = useState(true);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const bgColor = appearance.menu_bg_color || "#111827";
  const textColor = appearance.menu_text_color || "#f9fafb";
  const accentColor = appearance.menu_accent_color || "#3b82f6";
  const logoHeight = parseInt(appearance.logo_height || "40", 10);
  const organizationName = appearance.organization_name || "UnionSoftware";

  const mainNavItems = [
    { title: "Dashboard", href: "/", icon: LayoutDashboard },
    { title: "Grievances", href: "/grievances", icon: FileText },
    { title: "Members", href: "/members", icon: Users },
    { title: "Reports", href: "/reports", icon: BarChart3 },
  ];

  const settingsItems = [
    { title: "Profile", href: "/settings/profile", icon: User },
    { title: "Appearance", href: "/settings/appearance", icon: Palette },
    { title: "Departments", href: "/settings/departments", icon: Building2 },
    { title: "Users", href: "/settings/users", icon: UserCog },
    { title: "Grievance Settings", href: "/settings/grievance", icon: Briefcase },
    { title: "Custom Fields", href: "/settings/custom-fields", icon: FormInput },
    { title: "PDF Templates", href: "/settings/pdf-templates", icon: FileType },
    { title: "Email Templates", href: "/settings/email-templates", icon: Mail },
    { title: "Email Settings", href: "/settings/email", icon: Send },
  ];

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div
        className="flex items-center justify-center px-4 py-4 border-b shrink-0"
        style={{ borderColor: `${textColor}20`, minHeight: "64px" }}
      >
        {appearance.logo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={appearance.logo_url}
            alt="Logo"
            style={{ height: `${logoHeight}px`, width: "auto", maxWidth: "100%" }}
            className="object-contain"
          />
        ) : (
          <span className="text-xl font-bold text-center" style={{ color: textColor }}>
            {organizationName}
          </span>
        )}
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {/* Main Navigation */}
        {mainNavItems.map((item) => (
          <SheetClose asChild key={item.href}>
            <Link
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors"
              style={{
                backgroundColor: isActive(item.href) ? accentColor : "transparent",
                color: textColor,
              }}
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </Link>
          </SheetClose>
        ))}

        {/* Settings Section */}
        <div className="pt-2">
          <button
            onClick={() => setSettingsExpanded(!settingsExpanded)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-colors"
            style={{
              backgroundColor: isActive("/settings") ? `${textColor}15` : "transparent",
              color: textColor,
            }}
          >
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5" />
              Settings
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                settingsExpanded && "rotate-180"
              )}
            />
          </button>

          {settingsExpanded && (
            <div className="mt-1 space-y-1">
              {settingsItems.map((item) => (
                <SheetClose asChild key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 ml-4 px-3 py-2 text-sm rounded-md transition-colors"
                    style={{
                      backgroundColor: isActive(item.href) ? accentColor : "transparent",
                      color: isActive(item.href) ? textColor : `${textColor}99`,
                    }}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                </SheetClose>
              ))}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
