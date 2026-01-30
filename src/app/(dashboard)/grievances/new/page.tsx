"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GrievanceForm } from "@/components/grievances/grievance-form";
import { toast } from "sonner";
import type { GrievanceInput } from "@/lib/validations";
import type { Department, Member, User } from "@/types";

export default function NewGrievancePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/members").then((res) => res.json()),
      fetch("/api/users").then((res) => res.json()),
      fetch("/api/departments").then((res) => res.json()),
    ])
      .then(([membersData, usersData, deptsData]) => {
        setMembers(membersData.data || []);
        setUsers(usersData.data || []);
        setDepartments(deptsData.data || []);
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (data: GrievanceInput) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/grievances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to create grievance");
      }

      const result = await response.json();
      toast.success("Grievance created successfully");
      router.push(`/grievances/${result.data.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create grievance");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>New Grievance</CardTitle>
        </CardHeader>
        <CardContent>
          <GrievanceForm
            members={members}
            users={users}
            departments={departments}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
