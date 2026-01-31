"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Building2, Users, FileText, Settings, UserCheck } from "lucide-react";

interface Organization {
  id: string;
  clerkOrgId: string;
  name: string;
  slug: string;
  plan: string;
  maxUsers: number;
  userCount: number;
  createdAt: string;
}

interface OrganizationDetail extends Organization {
  users: {
    id: string;
    clerkUserId: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  }[];
  memberCount: number;
  grievanceCount: number;
}

const PLANS = [
  { value: "free", label: "Free", maxUsers: 5 },
  { value: "starter", label: "Starter", maxUsers: 15 },
  { value: "pro", label: "Pro", maxUsers: 50 },
  { value: "enterprise", label: "Enterprise", maxUsers: 500 },
];

const planColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-800",
  starter: "bg-blue-100 text-blue-800",
  pro: "bg-purple-100 text-purple-800",
  enterprise: "bg-amber-100 text-amber-800",
};

export default function AdminPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit dialog
  const [editingOrg, setEditingOrg] = useState<OrganizationDetail | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoadingOrg, setIsLoadingOrg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({ plan: "", maxUsers: 5 });

  // Impersonation
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch("/api/admin/organizations");
      if (response.status === 403) {
        setError("Access denied. You are not a super admin.");
        setIsLoading(false);
        return;
      }
      const data = await response.json();
      if (data.success) {
        setOrganizations(data.data);
      } else {
        setError(data.error || "Failed to load organizations");
      }
    } catch (err) {
      setError("Failed to load organizations");
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = async (org: Organization) => {
    setIsEditDialogOpen(true);
    setIsLoadingOrg(true);
    setEditForm({ plan: org.plan, maxUsers: org.maxUsers });

    try {
      const response = await fetch(`/api/admin/organizations/${org.id}`);
      const data = await response.json();
      if (data.success) {
        setEditingOrg(data.data);
      }
    } catch (err) {
      toast.error("Failed to load organization details");
    } finally {
      setIsLoadingOrg(false);
    }
  };

  const handleSave = async () => {
    if (!editingOrg) return;
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/organizations/${editingOrg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        toast.success("Organization updated");
        setIsEditDialogOpen(false);
        fetchOrganizations();
      } else {
        toast.error("Failed to update organization");
      }
    } catch (err) {
      toast.error("Failed to update organization");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImpersonate = async (clerkUserId: string, userName: string) => {
    if (!confirm(`Impersonate ${userName}? You will be signed in as this user.`)) {
      return;
    }

    setIsImpersonating(true);
    try {
      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: clerkUserId }),
      });

      const data = await response.json();
      if (data.success && data.signInUrl) {
        // Open impersonation in new tab
        window.open(data.signInUrl, "_blank");
        toast.success(`Impersonation session started for ${userName}`);
      } else {
        toast.error(data.error || "Failed to create impersonation session");
      }
    } catch (err) {
      toast.error("Failed to create impersonation session");
    } finally {
      setIsImpersonating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-red-600 text-center">{error}</p>
            <Button className="w-full mt-4" onClick={() => router.push("/")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Super Admin Panel</h1>
        <p className="text-gray-500">Manage all organizations and users</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Organizations
            </CardTitle>
            <Building2 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organizations.reduce((sum, org) => sum + org.userCount, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Plans Distribution
            </CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {PLANS.map((plan) => {
                const count = organizations.filter((o) => o.plan === plan.value).length;
                if (count === 0) return null;
                return (
                  <Badge key={plan.value} className={planColors[plan.value]}>
                    {plan.label}: {count}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-gray-500">{org.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={planColors[org.plan]}>
                      {PLANS.find((p) => p.value === org.plan)?.label || org.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        org.userCount >= org.maxUsers
                          ? "text-red-600 font-medium"
                          : ""
                      }
                    >
                      {org.userCount} / {org.maxUsers}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(org.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(org)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Organization Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOrg?.name || "Organization Details"}
            </DialogTitle>
          </DialogHeader>

          {isLoadingOrg ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : editingOrg ? (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold">{editingOrg.userCount}</p>
                  <p className="text-sm text-gray-500">Users</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold">{editingOrg.memberCount}</p>
                  <p className="text-sm text-gray-500">Members</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold">{editingOrg.grievanceCount}</p>
                  <p className="text-sm text-gray-500">Grievances</p>
                </div>
              </div>

              {/* Plan Settings */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium">Plan Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plan</Label>
                    <Select
                      value={editForm.plan}
                      onValueChange={(value) => {
                        const plan = PLANS.find((p) => p.value === value);
                        setEditForm({
                          plan: value,
                          maxUsers: plan?.maxUsers || editForm.maxUsers,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLANS.map((plan) => (
                          <SelectItem key={plan.value} value={plan.value}>
                            {plan.label} (up to {plan.maxUsers} users)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Users</Label>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={editForm.maxUsers}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          maxUsers: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>

              {/* Users */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium">Users ({editingOrg.users.length})</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editingOrg.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.isActive ? "default" : "secondary"}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleImpersonate(user.clerkUserId, user.name)
                            }
                            disabled={isImpersonating}
                            title="Impersonate user"
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
