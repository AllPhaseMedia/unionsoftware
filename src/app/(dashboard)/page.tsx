import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import {
  FileText,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
} from "lucide-react";

async function getDashboardData(organizationId: string) {
  const [
    totalGrievances,
    openGrievances,
    resolvedGrievances,
    totalMembers,
    grievancesByStatus,
    grievancesByPriority,
    membersByStatus,
    membersByDepartment,
    recentGrievances,
    upcomingDeadlines,
  ] = await Promise.all([
    prisma.grievance.count({ where: { organizationId } }),
    prisma.grievance.count({
      where: { organizationId, status: { in: ["OPEN", "IN_PROGRESS", "PENDING_RESPONSE"] } },
    }),
    prisma.grievance.count({
      where: { organizationId, status: { in: ["RESOLVED", "CLOSED"] } },
    }),
    prisma.member.count({ where: { organizationId } }),
    prisma.grievance.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: true,
    }),
    prisma.grievance.groupBy({
      by: ["priority"],
      where: { organizationId },
      _count: true,
    }),
    prisma.member.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: true,
    }),
    prisma.member.groupBy({
      by: ["departmentId"],
      where: { organizationId },
      _count: true,
    }),
    prisma.grievance.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        member: true,
        representative: true,
      },
    }),
    prisma.grievanceStep.findMany({
      where: {
        grievance: { organizationId },
        status: { in: ["PENDING", "IN_PROGRESS"] },
        deadline: { not: null },
      },
      orderBy: { deadline: "asc" },
      take: 5,
      include: {
        grievance: true,
      },
    }),
  ]);

  // Get department names for the member stats
  const departmentIds = membersByDepartment
    .map((m) => m.departmentId)
    .filter((id): id is string => id !== null);

  const departments = departmentIds.length > 0
    ? await prisma.department.findMany({
        where: { id: { in: departmentIds } },
        select: { id: true, name: true },
      })
    : [];

  const departmentMap = new Map(departments.map((d) => [d.id, d.name]));

  return {
    totalGrievances,
    openGrievances,
    resolvedGrievances,
    totalMembers,
    grievancesByStatus: grievancesByStatus.map((g) => ({
      status: g.status,
      count: g._count,
    })),
    grievancesByPriority: grievancesByPriority.map((g) => ({
      priority: g.priority,
      count: g._count,
    })),
    membersByStatus: membersByStatus.map((m) => ({
      status: m.status,
      count: m._count,
    })),
    membersByDepartment: membersByDepartment.map((m) => ({
      departmentId: m.departmentId,
      departmentName: m.departmentId ? departmentMap.get(m.departmentId) || "Unknown" : "No Department",
      count: m._count,
    })),
    recentGrievances,
    upcomingDeadlines,
  };
}

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  PENDING_RESPONSE: "bg-purple-100 text-purple-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
  WITHDRAWN: "bg-red-100 text-red-800",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

const memberStatusColors: Record<string, string> = {
  MEMBER: "bg-green-100 text-green-800",
  NON_MEMBER: "bg-yellow-100 text-yellow-800",
  SEVERED: "bg-red-100 text-red-800",
};

const memberStatusLabels: Record<string, string> = {
  MEMBER: "Member",
  NON_MEMBER: "Non-Member",
  SEVERED: "Severed",
};

export default async function DashboardPage() {
  const dbUser = await getAuthUser();

  if (!dbUser) {
    redirect("/sign-in");
  }

  const data = await getDashboardData(dbUser.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Welcome back! Here&apos;s an overview of your union&apos;s activity.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/grievances">
          <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Grievances
              </CardTitle>
              <FileText className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalGrievances}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/grievances?status=OPEN">
          <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Open Grievances
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.openGrievances}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/grievances?status=RESOLVED">
          <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Resolved
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.resolvedGrievances}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/members">
          <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Members
              </CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalMembers}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Grievances */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Grievances</CardTitle>
            <Link
              href="/grievances"
              className="text-sm text-blue-600 hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentGrievances.length === 0 ? (
              <p className="text-gray-500 text-sm">No grievances yet.</p>
            ) : (
              <div className="space-y-4">
                {data.recentGrievances.map((grievance) => (
                  <Link
                    key={grievance.id}
                    href={`/grievances/${grievance.id}`}
                    className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {grievance.grievanceNumber}
                      </span>
                      <Badge className={statusColors[grievance.status]}>
                        {grievance.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-1">
                      {grievance.description}
                    </p>
                    {grievance.member && (
                      <p className="text-xs text-gray-400 mt-1">
                        Member: {grievance.member.firstName} {grievance.member.lastName}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Deadlines</CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {data.upcomingDeadlines.length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming deadlines.</p>
            ) : (
              <div className="space-y-4">
                {data.upcomingDeadlines.map((step) => (
                  <Link
                    key={step.id}
                    href={`/grievances/${step.grievanceId}`}
                    className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{step.name}</span>
                      <span className="text-sm text-gray-500">
                        {step.deadline && format(new Date(step.deadline), "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Grievance: {step.grievance.grievanceNumber}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grievance Status and Priority Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Grievances by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.grievancesByStatus.map((item) => (
                <Link
                  key={item.status}
                  href={`/grievances?status=${item.status}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
                >
                  <Badge className={statusColors[item.status]}>
                    {item.status.replace("_", " ")}
                  </Badge>
                  <span className="font-medium">{item.count}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Grievances by Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.grievancesByPriority.map((item) => (
                <Link
                  key={item.priority}
                  href={`/grievances?priority=${item.priority}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
                >
                  <Badge className={priorityColors[item.priority]}>
                    {item.priority}
                  </Badge>
                  <span className="font-medium">{item.count}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Member Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.membersByStatus.map((item) => (
                <Link
                  key={item.status}
                  href={`/members?statuses=${item.status}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
                >
                  <Badge className={memberStatusColors[item.status]}>
                    {memberStatusLabels[item.status]}
                  </Badge>
                  <span className="font-medium">{item.count}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.membersByDepartment.length === 0 ? (
                <p className="text-gray-500 text-sm">No members yet.</p>
              ) : (
                data.membersByDepartment.map((item) => (
                  <Link
                    key={item.departmentId || "none"}
                    href={item.departmentId ? `/members?departmentIds=${item.departmentId}` : "/members"}
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-700">{item.departmentName}</span>
                    <span className="font-medium">{item.count}</span>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
