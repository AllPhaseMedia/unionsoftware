import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  FormInput,
  FileType,
  Mail,
  UserCog,
  Palette,
  Briefcase,
} from "lucide-react";

interface SettingItem {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SettingsCategory {
  name: string;
  description: string;
  items: SettingItem[];
}

const settingsCategories: SettingsCategory[] = [
  {
    name: "Organization",
    description: "General organization settings",
    items: [
      {
        title: "Appearance",
        description: "Logo, colors, and branding",
        href: "/settings/appearance",
        icon: Palette,
      },
      {
        title: "Departments",
        description: "Manage departments and work areas",
        href: "/settings/departments",
        icon: Building2,
      },
      {
        title: "Users",
        description: "Manage users and permissions",
        href: "/settings/users",
        icon: UserCog,
      },
      {
        title: "Grievance Settings",
        description: "Workflow steps, text snippets, and contracts",
        href: "/settings/grievance",
        icon: Briefcase,
      },
    ],
  },
  {
    name: "Customization",
    description: "Customize fields and templates",
    items: [
      {
        title: "Custom Fields",
        description: "Create custom fields for grievances and members",
        href: "/settings/custom-fields",
        icon: FormInput,
      },
      {
        title: "PDF Templates",
        description: "Design PDF export templates",
        href: "/settings/pdf-templates",
        icon: FileType,
      },
      {
        title: "Email Templates",
        description: "Configure email notification templates",
        href: "/settings/email-templates",
        icon: Mail,
      },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500">Configure your organization</p>
      </div>

      {settingsCategories.map((category) => (
        <div key={category.name} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{category.name}</h2>
            <p className="text-sm text-gray-500">{category.description}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {category.items.map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <item.icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{item.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
