import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GrievanceCard } from "@/components/grievances/grievance-card";
import { Plus, Search } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    priority?: string;
    department?: string;
    page?: string;
  }>;
}

export default async function GrievancesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: authUser.id },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const page = parseInt(params.page || "1");
  const pageSize = 12;
  const skip = (page - 1) * pageSize;

  const where = {
    organizationId: dbUser.organizationId,
    ...(params.search && {
      OR: [
        { grievanceNumber: { contains: params.search, mode: "insensitive" as const } },
        { description: { contains: params.search, mode: "insensitive" as const } },
      ],
    }),
    ...(params.status && {
      status: params.status as "OPEN" | "IN_PROGRESS" | "PENDING_RESPONSE" | "RESOLVED" | "CLOSED" | "WITHDRAWN",
    }),
    ...(params.priority && {
      priority: params.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    }),
    ...(params.department && { departmentId: params.department }),
  };

  const [grievances, total, departments, statusCounts] = await Promise.all([
    prisma.grievance.findMany({
      where,
      include: {
        member: true,
        representative: true,
        department: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.grievance.count({ where }),
    prisma.department.findMany({
      where: { organizationId: dbUser.organizationId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.grievance.groupBy({
      by: ["status"],
      where: { organizationId: dbUser.organizationId },
      _count: true,
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const getStatusCount = (status: string) =>
    statusCounts.find((s) => s.status === status)?._count || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grievances</h1>
          <p className="text-gray-500">Track and manage grievances</p>
        </div>
        <Link href="/grievances/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Grievance
          </Button>
        </Link>
      </div>

      {/* Status Tabs */}
      <Tabs defaultValue={params.status || "all"} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all" asChild>
            <Link href="/grievances">All ({total})</Link>
          </TabsTrigger>
          <TabsTrigger value="OPEN" asChild>
            <Link href="/grievances?status=OPEN">Open ({getStatusCount("OPEN")})</Link>
          </TabsTrigger>
          <TabsTrigger value="IN_PROGRESS" asChild>
            <Link href="/grievances?status=IN_PROGRESS">
              In Progress ({getStatusCount("IN_PROGRESS")})
            </Link>
          </TabsTrigger>
          <TabsTrigger value="PENDING_RESPONSE" asChild>
            <Link href="/grievances?status=PENDING_RESPONSE">
              Pending ({getStatusCount("PENDING_RESPONSE")})
            </Link>
          </TabsTrigger>
          <TabsTrigger value="RESOLVED" asChild>
            <Link href="/grievances?status=RESOLVED">
              Resolved ({getStatusCount("RESOLVED")})
            </Link>
          </TabsTrigger>
          <TabsTrigger value="CLOSED" asChild>
            <Link href="/grievances?status=CLOSED">
              Closed ({getStatusCount("CLOSED")})
            </Link>
          </TabsTrigger>
          <TabsTrigger value="WITHDRAWN" asChild>
            <Link href="/grievances?status=WITHDRAWN">
              Withdrawn ({getStatusCount("WITHDRAWN")})
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <form className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              name="search"
              placeholder="Search grievances..."
              defaultValue={params.search}
              className="pl-10"
            />
          </div>
        </form>

        <Select defaultValue={params.priority || "all"}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue={params.department || "all"}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grievances Grid */}
      {grievances.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No grievances found.</p>
          <Link href="/grievances/new">
            <Button variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create your first grievance
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {grievances.map((grievance) => (
              <GrievanceCard key={grievance.id} grievance={grievance} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {skip + 1} to {Math.min(skip + pageSize, total)} of{" "}
                {total} grievances
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/grievances?page=${page - 1}${
                      params.search ? `&search=${params.search}` : ""
                    }${params.status ? `&status=${params.status}` : ""}${
                      params.priority ? `&priority=${params.priority}` : ""
                    }${params.department ? `&department=${params.department}` : ""}`}
                  >
                    <Button variant="outline" size="sm">
                      Previous
                    </Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/grievances?page=${page + 1}${
                      params.search ? `&search=${params.search}` : ""
                    }${params.status ? `&status=${params.status}` : ""}${
                      params.priority ? `&priority=${params.priority}` : ""
                    }${params.department ? `&department=${params.department}` : ""}`}
                  >
                    <Button variant="outline" size="sm">
                      Next
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
