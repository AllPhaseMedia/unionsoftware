"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DisciplinaryForm } from "@/components/disciplinary/disciplinary-form";
import { toast } from "sonner";
import type { DisciplinaryInput } from "@/lib/validations";
import type { Department, Member, User } from "@/types";

export default function NewDisciplinaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedMemberId = searchParams.get("memberId");
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

  const handleSubmit = async (data: DisciplinaryInput) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/disciplinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to create case");
      }

      const result = await response.json();
      toast.success("Disciplinary case created successfully");
      router.push(`/disciplinary/${result.data.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create case");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>New Disciplinary Review Case</CardTitle>
        </CardHeader>
        <CardContent>
          <DisciplinaryForm
            members={members}
            users={users}
            departments={departments}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            preselectedMemberId={preselectedMemberId || undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
