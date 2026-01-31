"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DisciplinaryForm } from "@/components/disciplinary/disciplinary-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { DisciplinaryInput } from "@/lib/validations";
import type { Department, Member, User, DisciplinaryCase } from "@/types";
import { use } from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditDisciplinaryPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [disciplinaryCase, setDisciplinaryCase] = useState<DisciplinaryCase | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/disciplinary/${id}`).then((res) => res.json()),
      fetch("/api/members").then((res) => res.json()),
      fetch("/api/users").then((res) => res.json()),
      fetch("/api/departments").then((res) => res.json()),
    ])
      .then(([caseData, membersData, usersData, deptsData]) => {
        if (!caseData.success) {
          toast.error("Case not found");
          router.push("/disciplinary");
          return;
        }
        setDisciplinaryCase(caseData.data);
        setMembers(membersData.data || []);
        setUsers(usersData.data || []);
        setDepartments(deptsData.data || []);
      })
      .catch((error) => {
        console.error("Error loading data:", error);
        toast.error("Failed to load case data");
      })
      .finally(() => {
        setIsDataLoading(false);
      });
  }, [id, router]);

  const handleSubmit = async (data: DisciplinaryInput) => {
    setIsLoading(true);
    try {
      // Include status for update schema
      const updateData = {
        ...data,
        status: disciplinaryCase?.status || "OPEN",
      };

      const response = await fetch(`/api/disciplinary/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to update case");
      }

      toast.success("Case updated successfully");
      router.push(`/disciplinary/${id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update case");
    } finally {
      setIsLoading(false);
    }
  };

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!disciplinaryCase) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Edit Case #{disciplinaryCase.caseNumber}</CardTitle>
        </CardHeader>
        <CardContent>
          <DisciplinaryForm
            disciplinaryCase={disciplinaryCase}
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
