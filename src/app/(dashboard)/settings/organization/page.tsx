import { OrganizationProfile } from "@clerk/nextjs";

export default function OrganizationSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Organization Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your organization, invite members, and assign roles.
        </p>
      </div>
      <OrganizationProfile
        appearance={{
          elements: {
            rootBox: "w-full",
            cardBox: "shadow-none border rounded-lg",
          },
        }}
      />
    </div>
  );
}
