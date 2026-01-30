import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  ListChecks,
  FormInput,
  FileType,
  Mail,
  FileCheck,
  UserCog,
} from "lucide-react";

const settingsItems = [
  {
    title: "Departments",
    description: "Manage departments and work areas",
    href: "/settings/departments",
    icon: Building2,
  },
  {
    title: "Workflow Steps",
    description: "Configure grievance workflow steps",
    href: "/settings/steps",
    icon: ListChecks,
  },
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
  {
    title: "Contracts",
    description: "Manage collective bargaining agreements",
    href: "/settings/contracts",
    icon: FileCheck,
  },
  {
    title: "Users",
    description: "Manage users and permissions",
    href: "/settings/users",
    icon: UserCog,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500">Configure your organization</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsItems.map((item) => (
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
  );
}
