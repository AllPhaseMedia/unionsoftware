import { CreateOrganization } from "@clerk/nextjs";

export default function CreateOrganizationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <CreateOrganization afterCreateOrganizationUrl="/setup" />
    </div>
  );
}
