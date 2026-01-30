"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GrievanceForm } from "@/components/grievances/grievance-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { GrievanceInput } from "@/lib/validations";
import type { Department, Member, User, ContractWithArticles, Grievance } from "@/types";
import { use } from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditGrievancePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [grievance, setGrievance] = useState<Grievance | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [contracts, setContracts] = useState<ContractWithArticles[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/grievances/${id}`).then((res) => res.json()),
      fetch("/api/members").then((res) => res.json()),
      fetch("/api/users").then((res) => res.json()),
      fetch("/api/departments").then((res) => res.json()),
      fetch("/api/contracts?includeArticles=true").then((res) => res.json()),
    ])
      .then(([grievanceData, membersData, usersData, deptsData, contractsData]) => {
        if (!grievanceData.success) {
          toast.error("Grievance not found");
          router.push("/grievances");
          return;
        }
        setGrievance(grievanceData.data);
        setMembers(membersData.data || []);
        setUsers(usersData.data || []);
        setDepartments(deptsData.data || []);
        setContracts(contractsData.data || []);
      })
      .catch((error) => {
        console.error("Error loading data:", error);
        toast.error("Failed to load grievance data");
      })
      .finally(() => {
        setIsDataLoading(false);
      });
  }, [id, router]);

  const handleSubmit = async (data: GrievanceInput) => {
    setIsLoading(true);
    try {
      // Include status for update schema
      const updateData = {
        ...data,
        status: grievance?.status || "OPEN",
      };

      const response = await fetch(`/api/grievances/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to update grievance");
      }

      toast.success("Grievance updated successfully");
      router.push(`/grievances/${id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update grievance");
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

  if (!grievance) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Edit Grievance #{grievance.grievanceNumber}</CardTitle>
        </CardHeader>
        <CardContent>
          <GrievanceForm
            grievance={grievance}
            members={members}
            users={users}
            departments={departments}
            contracts={contracts}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
