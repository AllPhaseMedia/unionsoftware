import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { subMonths, startOfMonth, endOfMonth, format, differenceInDays } from "date-fns";
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  FileDown,
  PieChart,
} from "lucide-react";

async function getReportsData(organizationId: string) {
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 6);

  // Get grievances for the last 6 months
  const recentGrievances = await prisma.grievance.findMany({
    where: {
      organizationId,
      createdAt: { gte: sixMonthsAgo },
    },
    include: {
      department: true,
      steps: true,
    },
  });

  // Monthly breakdown
  const monthlyData: Record<string, { filed: number; resolved: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const month = subMonths(now, i);
    const key = format(month, "MMM yyyy");
    monthlyData[key] = { filed: 0, resolved: 0 };
  }

  recentGrievances.forEach((g) => {
    const filedMonth = format(new Date(g.createdAt), "MMM yyyy");
    if (monthlyData[filedMonth]) {
      monthlyData[filedMonth].filed++;
    }

    if (
      (g.status === "RESOLVED" || g.status === "CLOSED") &&
      g.updatedAt >= sixMonthsAgo
    ) {
      const resolvedMonth = format(new Date(g.updatedAt), "MMM yyyy");
      if (monthlyData[resolvedMonth]) {
        monthlyData[resolvedMonth].resolved++;
      }
    }
  });

  // Status breakdown
  const statusCounts = await prisma.grievance.groupBy({
    by: ["status"],
    where: { organizationId },
    _count: true,
  });

  // Priority breakdown
  const priorityCounts = await prisma.grievance.groupBy({
    by: ["priority"],
    where: { organizationId },
    _count: true,
  });

  // Outcome breakdown (for resolved cases)
  const outcomeCounts = await prisma.grievance.groupBy({
    by: ["outcome"],
    where: {
      organizationId,
      outcome: { not: null },
    },
    _count: true,
  });

  // Department breakdown
  const departmentCounts = await prisma.grievance.groupBy({
    by: ["departmentId"],
    where: {
      organizationId,
      departmentId: { not: null },
    },
    _count: true,
  });

  const departments = await prisma.department.findMany({
    where: { organizationId },
  });

  const departmentData = departmentCounts.map((dc) => ({
    name: departments.find((d) => d.id === dc.departmentId)?.name || "Unknown",
    count: dc._count,
  }));

  // Resolution time (average days from filing to resolution)
  const resolvedGrievances = recentGrievances.filter(
    (g) => g.status === "RESOLVED" || g.status === "CLOSED"
  );

  const avgResolutionTime =
    resolvedGrievances.length > 0
      ? Math.round(
          resolvedGrievances.reduce((acc, g) => {
            return acc + differenceInDays(new Date(g.updatedAt), new Date(g.filingDate));
          }, 0) / resolvedGrievances.length
        )
      : 0;

  // Step completion rates
  const allSteps = recentGrievances.flatMap((g) => g.steps);
  const completedSteps = allSteps.filter((s) => s.status === "COMPLETED").length;
  const stepCompletionRate =
    allSteps.length > 0 ? Math.round((completedSteps / allSteps.length) * 100) : 0;

  // Settlement totals
  const settlementTotal = await prisma.grievance.aggregate({
    where: {
      organizationId,
      outcome: "SETTLED",
      settlementAmount: { not: null },
    },
    _sum: { settlementAmount: true },
    _count: true,
  });

  return {
    monthlyData: Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data,
    })),
    statusCounts: statusCounts.map((s) => ({ status: s.status, count: s._count })),
    priorityCounts: priorityCounts.map((p) => ({ priority: p.priority, count: p._count })),
    outcomeCounts: outcomeCounts.map((o) => ({
      outcome: o.outcome || "Unknown",
      count: o._count,
    })),
    departmentData,
    avgResolutionTime,
    stepCompletionRate,
    totalSettlement: Number(settlementTotal._sum.settlementAmount || 0),
    settlementCount: settlementTotal._count,
    totalGrievances: recentGrievances.length,
    resolvedCount: resolvedGrievances.length,
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

const outcomeColors: Record<string, string> = {
  WON: "bg-green-100 text-green-800",
  LOST: "bg-red-100 text-red-800",
  SETTLED: "bg-yellow-100 text-yellow-800",
  WITHDRAWN: "bg-gray-100 text-gray-800",
  PENDING_ARBITRATION: "bg-purple-100 text-purple-800",
};

export default async function ReportsPage() {
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

  const data = await getReportsData(dbUser.organizationId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-gray-500">Grievance analytics and trends</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="6months">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Grievances (6 months)
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalGrievances}</div>
            <p className="text-xs text-gray-500">
              {data.resolvedCount} resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Avg Resolution Time
            </CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgResolutionTime} days</div>
            <p className="text-xs text-gray-500">From filing to resolution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Step Completion Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stepCompletionRate}%</div>
            <p className="text-xs text-gray-500">Workflow steps completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Settlements
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.totalSettlement.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">
              From {data.settlementCount} settled cases
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 h-48">
            {data.monthlyData.map((item) => (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="flex gap-1 items-end h-32 w-full">
                  <div
                    className="flex-1 bg-blue-200 rounded-t"
                    style={{
                      height: `${
                        data.totalGrievances > 0
                          ? (item.filed / Math.max(...data.monthlyData.map((d) => d.filed || 1))) * 100
                          : 0
                      }%`,
                      minHeight: item.filed > 0 ? "8px" : "0",
                    }}
                    title={`Filed: ${item.filed}`}
                  />
                  <div
                    className="flex-1 bg-green-200 rounded-t"
                    style={{
                      height: `${
                        data.totalGrievances > 0
                          ? (item.resolved / Math.max(...data.monthlyData.map((d) => d.filed || 1))) * 100
                          : 0
                      }%`,
                      minHeight: item.resolved > 0 ? "8px" : "0",
                    }}
                    title={`Resolved: ${item.resolved}`}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">{item.month}</p>
                  <p className="text-xs">
                    <span className="text-blue-600">{item.filed}</span>/
                    <span className="text-green-600">{item.resolved}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-200 rounded" />
              <span className="text-sm text-gray-500">Filed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-200 rounded" />
              <span className="text-sm text-gray-500">Resolved</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              By Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.statusCounts.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <Badge className={statusColors[item.status]}>
                    {item.status.replace("_", " ")}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${
                            data.totalGrievances > 0
                              ? (item.count / data.totalGrievances) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="font-medium w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Outcome Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.outcomeCounts.length === 0 ? (
              <p className="text-gray-500 text-sm">No resolved cases yet.</p>
            ) : (
              <div className="space-y-3">
                {data.outcomeCounts.map((item) => (
                  <div key={item.outcome} className="flex items-center justify-between">
                    <Badge className={outcomeColors[item.outcome] || "bg-gray-100"}>
                      {item.outcome.replace("_", " ")}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{
                            width: `${
                              data.resolvedCount > 0
                                ? (item.count / data.resolvedCount) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="font-medium w-8 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Department</CardTitle>
          </CardHeader>
          <CardContent>
            {data.departmentData.length === 0 ? (
              <p className="text-gray-500 text-sm">No department data available.</p>
            ) : (
              <div className="space-y-3">
                {data.departmentData
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5)
                  .map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{
                              width: `${
                                data.totalGrievances > 0
                                  ? (item.count / data.totalGrievances) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="font-medium w-8 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["URGENT", "HIGH", "MEDIUM", "LOW"].map((priority) => {
                const item = data.priorityCounts.find((p) => p.priority === priority);
                const count = item?.count || 0;
                return (
                  <div key={priority} className="flex items-center justify-between">
                    <Badge
                      className={
                        priority === "URGENT"
                          ? "bg-red-100 text-red-800"
                          : priority === "HIGH"
                          ? "bg-orange-100 text-orange-800"
                          : priority === "MEDIUM"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {priority}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            priority === "URGENT"
                              ? "bg-red-500"
                              : priority === "HIGH"
                              ? "bg-orange-500"
                              : priority === "MEDIUM"
                              ? "bg-blue-500"
                              : "bg-gray-500"
                          }`}
                          style={{
                            width: `${
                              data.totalGrievances > 0
                                ? (count / data.totalGrievances) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="font-medium w-8 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
