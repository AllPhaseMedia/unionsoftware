"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Search,
  Settings2,
  Loader2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickNote } from "@/components/ui/quick-note";
import type { Department, StepTemplate } from "@/types";

// Grievance type for list view
interface GrievanceListItem {
  id: string;
  grievanceNumber: string;
  description: string;
  status: string;
  priority: string;
  filingDate: Date | string;
  createdAt: Date | string;
  member: { id: string; firstName: string; lastName: string } | null;
  representative: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  steps: { id: string; stepNumber: number; status: string; deadline: Date | string | null }[];
}

interface GrievancesListProps {
  initialGrievances: GrievanceListItem[];
  initialTotal: number;
  stepTemplates: StepTemplate[];
  departments: Department[];
}

// Format date as M/D/YYYY
function formatDate(date: string | Date | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

interface Column {
  id: string;
  label: string;
  accessor: (grievance: GrievanceListItem) => string;
  locked?: boolean;
  sortable?: boolean;
}

const ALL_COLUMNS: Column[] = [
  {
    id: "grievanceNumber",
    label: "Grievance #",
    accessor: (g) => g.grievanceNumber,
    locked: true,
    sortable: true,
  },
  {
    id: "member",
    label: "Member",
    accessor: (g) => g.member ? `${g.member.lastName}, ${g.member.firstName}` : "-",
    sortable: true,
  },
  {
    id: "department",
    label: "Department",
    accessor: (g) => g.department?.name || "-",
    sortable: true,
  },
  {
    id: "description",
    label: "Description",
    accessor: (g) => g.description?.substring(0, 60) + (g.description?.length > 60 ? "..." : "") || "-",
    sortable: false,
  },
  {
    id: "priority",
    label: "Priority",
    accessor: (g) => g.priority,
    sortable: true,
  },
  {
    id: "status",
    label: "Status",
    accessor: (g) => g.status.replace("_", " "),
    sortable: true,
  },
  {
    id: "representative",
    label: "Representative",
    accessor: (g) => g.representative?.name || "-",
    sortable: true,
  },
  {
    id: "filingDate",
    label: "Filing Date",
    accessor: (g) => formatDate(g.filingDate),
    sortable: true,
  },
  {
    id: "deadline",
    label: "Next Deadline",
    accessor: (g) => {
      const activeStep = g.steps?.find(s => s.status === "IN_PROGRESS" || s.status === "PENDING");
      return activeStep?.deadline ? formatDate(activeStep.deadline) : "-";
    },
    sortable: true,
  },
];

const DEFAULT_VISIBLE_COLUMNS = ["grievanceNumber", "member", "department", "priority", "status", "filingDate", "deadline"];

type SortDirection = "asc" | "desc" | null;

export function GrievancesList({ initialGrievances, initialTotal, stepTemplates, departments }: GrievancesListProps) {
  const [grievances, setGrievances] = useState<GrievanceListItem[]>(initialGrievances);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(initialTotal);

  // Search and filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>("grievanceNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Column customization
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [columnOrder, setColumnOrder] = useState<string[]>(ALL_COLUMNS.map(c => c.id));
  const [isHydrated, setIsHydrated] = useState(false);

  // Track initial filter values to detect actual changes (not just hydration)
  const initialFilters = useRef({
    search: "",
    status: "all",
    priority: "all",
    department: "all",
  });
  const hasFetchedOnce = useRef(false);

  // Load saved preferences from localStorage after hydration
  useEffect(() => {
    const savedColumns = localStorage.getItem("grievanceTableColumns");
    if (savedColumns) {
      try {
        setVisibleColumns(JSON.parse(savedColumns));
      } catch {
        // Keep defaults
      }
    }

    const savedOrder = localStorage.getItem("grievanceTableColumnOrder");
    if (savedOrder) {
      try {
        setColumnOrder(JSON.parse(savedOrder));
      } catch {
        // Keep defaults
      }
    }

    setIsHydrated(true);
  }, []);

  // Drag state
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Save column preferences
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("grievanceTableColumns", JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("grievanceTableColumnOrder", JSON.stringify(columnOrder));
    }
  }, [columnOrder, isHydrated]);

  // Fetch grievances when filters change
  const fetchGrievances = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (departmentFilter !== "all") params.set("departmentId", departmentFilter);
      params.set("limit", "200");

      const response = await fetch(`/api/grievances?${params.toString()}`);
      const data = await response.json();

      setGrievances(data.data || []);
      setTotal(data.pagination?.total || (data.data || []).length);
    } catch (error) {
      console.error("Error fetching grievances:", error);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, priorityFilter, departmentFilter]);

  // Check if filters have actually changed from initial values
  const filtersChanged = () => {
    const init = initialFilters.current;
    return (
      search !== init.search ||
      statusFilter !== init.status ||
      priorityFilter !== init.priority ||
      departmentFilter !== init.department
    );
  };

  // Fetch when filters change (only if they differ from initial server-rendered values)
  useEffect(() => {
    // Skip if filters match initial values (we already have server data)
    if (!filtersChanged()) {
      return;
    }

    hasFetchedOnce.current = true;
    const timeout = setTimeout(() => {
      fetchGrievances();
    }, 150);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, priorityFilter, departmentFilter]);

  // Determine current step for a grievance
  const getCurrentStep = (grievance: GrievanceListItem): number | null => {
    if (!grievance.steps || grievance.steps.length === 0) return null;

    const inProgressStep = grievance.steps.find(s => s.status === "IN_PROGRESS");
    if (inProgressStep) return inProgressStep.stepNumber;

    const pendingSteps = grievance.steps
      .filter(s => s.status === "PENDING")
      .sort((a, b) => a.stepNumber - b.stepNumber);
    if (pendingSteps.length > 0) return pendingSteps[0].stepNumber;

    const completedSteps = grievance.steps
      .filter(s => s.status === "COMPLETED")
      .sort((a, b) => b.stepNumber - a.stepNumber);
    if (completedSteps.length > 0) return completedSteps[0].stepNumber;

    return grievance.steps[0]?.stepNumber || null;
  };

  // Group grievances by step
  const grievancesByStep = useMemo(() => {
    const groups: Map<number | string, GrievanceListItem[]> = new Map();

    stepTemplates.forEach(template => {
      groups.set(template.stepNumber, []);
    });

    groups.set("none", []);
    groups.set("resolved", []);

    grievances.forEach(grievance => {
      if (["RESOLVED", "CLOSED", "WITHDRAWN"].includes(grievance.status)) {
        groups.get("resolved")?.push(grievance);
        return;
      }

      const currentStep = getCurrentStep(grievance);
      if (currentStep === null) {
        groups.get("none")?.push(grievance);
      } else if (groups.has(currentStep)) {
        groups.get(currentStep)?.push(grievance);
      } else {
        groups.get("none")?.push(grievance);
      }
    });

    return groups;
  }, [grievances, stepTemplates]);

  // Sort grievances within a group
  const sortGrievances = (items: GrievanceListItem[]): GrievanceListItem[] => {
    if (!sortColumn || !sortDirection) return items;

    const column = ALL_COLUMNS.find(c => c.id === sortColumn);
    if (!column) return items;

    return [...items].sort((a, b) => {
      const aVal = column.accessor(a);
      const bVal = column.accessor(b);

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;

      return sortDirection === "desc" ? -comparison : comparison;
    });
  };

  // Get ordered and visible columns
  const displayColumns = useMemo(() => {
    return columnOrder
      .filter(id => visibleColumns.includes(id))
      .map(id => ALL_COLUMNS.find(c => c.id === id)!)
      .filter(Boolean);
  }, [columnOrder, visibleColumns]);

  const toggleColumn = (columnId: string) => {
    const column = ALL_COLUMNS.find(c => c.id === columnId);
    if (column?.locked) return;

    setVisibleColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const toggleSection = (stepKey: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepKey)) {
        newSet.delete(stepKey);
      } else {
        newSet.add(stepKey);
      }
      return newSet;
    });
  };

  const handleSort = (columnId: string) => {
    const column = ALL_COLUMNS.find(c => c.id === columnId);
    if (!column?.sortable) return;

    if (sortColumn === columnId) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortColumn("");
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    const column = ALL_COLUMNS.find(c => c.id === columnId);
    if (column?.locked) {
      e.preventDefault();
      return;
    }
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const column = ALL_COLUMNS.find(c => c.id === columnId);
    if (column?.locked || columnId === draggedColumn) return;
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnId) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    const targetColumn = ALL_COLUMNS.find(c => c.id === targetColumnId);
    if (targetColumn?.locked) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    setColumnOrder(prev => {
      const newOrder = [...prev];
      const draggedIndex = newOrder.indexOf(draggedColumn);
      const targetIndex = newOrder.indexOf(targetColumnId);

      if (targetIndex === 0) {
        setDraggedColumn(null);
        setDragOverColumn(null);
        return prev;
      }

      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedColumn);
      return newOrder;
    });

    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <Badge variant="destructive">Urgent</Badge>;
      case "HIGH":
        return <Badge className="bg-orange-500">High</Badge>;
      case "MEDIUM":
        return <Badge variant="secondary">Medium</Badge>;
      case "LOW":
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge className="bg-blue-500">Open</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-yellow-500">In Progress</Badge>;
      case "PENDING_RESPONSE":
        return <Badge className="bg-purple-500">Pending</Badge>;
      case "RESOLVED":
        return <Badge className="bg-green-500">Resolved</Badge>;
      case "CLOSED":
        return <Badge variant="secondary">Closed</Badge>;
      case "WITHDRAWN":
        return <Badge variant="outline">Withdrawn</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSortIcon = (columnId: string) => {
    const column = ALL_COLUMNS.find(c => c.id === columnId);
    if (!column?.sortable) return null;

    if (sortColumn !== columnId) {
      return <ArrowUpDown className="h-3 w-3 ml-1 text-gray-400" />;
    }

    if (sortDirection === "asc") {
      return <ArrowUp className="h-3 w-3 ml-1" />;
    }
    if (sortDirection === "desc") {
      return <ArrowDown className="h-3 w-3 ml-1" />;
    }
    return <ArrowUpDown className="h-3 w-3 ml-1 text-gray-400" />;
  };

  const getSectionName = (stepKey: number | string): string => {
    if (stepKey === "none") return "No Step Assigned";
    if (stepKey === "resolved") return "Resolved / Closed";

    const template = stepTemplates.find(t => t.stepNumber === stepKey);
    return template?.name || `Step ${stepKey}`;
  };

  const renderSection = (stepKey: number | string, sectionGrievances: GrievanceListItem[]) => {
    const sectionName = getSectionName(stepKey);
    const isCollapsed = collapsedSections.has(String(stepKey));
    const sortedGrievances = sortGrievances(sectionGrievances);

    if (sectionGrievances.length === 0 && (stepKey === "none" || stepKey === "resolved")) {
      return null;
    }

    return (
      <div key={String(stepKey)} className="border rounded-lg overflow-hidden mb-12">
        <Collapsible open={!isCollapsed} onOpenChange={() => toggleSection(String(stepKey))}>
          <CollapsibleTrigger asChild>
            <button
              className="flex items-center justify-between w-full px-4 py-3 transition-colors hover:brightness-95"
              style={{ backgroundColor: "#f2f2f2" }}
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="font-semibold">{sectionName}</span>
                <Badge variant="secondary" className="ml-2">
                  {sectionGrievances.length}
                </Badge>
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {sectionGrievances.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500">
                No grievances at this step
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {displayColumns.map((column) => (
                        <TableHead
                          key={column.id}
                          draggable={!column.locked}
                          onDragStart={(e) => handleDragStart(e, column.id)}
                          onDragOver={(e) => handleDragOver(e, column.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, column.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleSort(column.id)}
                          className={cn(
                            "select-none whitespace-nowrap",
                            !column.locked && "cursor-grab active:cursor-grabbing",
                            column.sortable && "cursor-pointer hover:bg-gray-100",
                            dragOverColumn === column.id && "bg-blue-50 border-l-2 border-blue-400",
                            draggedColumn === column.id && "opacity-50",
                            column.locked && "sticky left-0 bg-white z-10"
                          )}
                        >
                          <div className="flex items-center gap-1">
                            {!column.locked && (
                              <GripVertical className="h-3 w-3 text-gray-400" />
                            )}
                            {column.label}
                            {getSortIcon(column.id)}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedGrievances.map((grievance) => (
                      <TableRow key={grievance.id} className="hover:bg-gray-50">
                        {displayColumns.map((column) => (
                          <TableCell
                            key={column.id}
                            className={cn(
                              column.locked && "sticky left-0 bg-white z-10",
                              column.id === "description" && "max-w-[200px] truncate"
                            )}
                          >
                            {column.id === "grievanceNumber" ? (
                              <div className="flex items-center gap-1">
                                <Link
                                  href={`/grievances/${grievance.id}`}
                                  className="font-medium text-blue-600 hover:underline"
                                >
                                  {column.accessor(grievance)}
                                </Link>
                                <QuickNote
                                  entityType="grievance"
                                  entityId={grievance.id}
                                />
                              </div>
                            ) : column.id === "priority" ? (
                              getPriorityBadge(grievance.priority)
                            ) : column.id === "status" ? (
                              getStatusBadge(grievance.status)
                            ) : column.id === "member" && grievance.member ? (
                              <Link
                                href={`/members/${grievance.member.id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {column.accessor(grievance)}
                              </Link>
                            ) : (
                              column.accessor(grievance)
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grievances</h1>
          <p className="text-gray-500">
            {total} grievance{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/grievances/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Grievance
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by grievance #, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="PENDING_RESPONSE">Pending</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
            <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
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

        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
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

        {/* Column Settings Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" title="Table Settings">
              <Settings2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Table Columns</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-500 mb-4">
              Select which columns to display. Drag column headers in the table to reorder.
            </p>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {ALL_COLUMNS.map((column) => (
                <label
                  key={column.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer",
                    column.locked && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <Checkbox
                    checked={visibleColumns.includes(column.id)}
                    onCheckedChange={() => toggleColumn(column.id)}
                    disabled={column.locked}
                  />
                  <span className="flex-1">{column.label}</span>
                  {column.locked && (
                    <span className="text-xs text-gray-400">Always visible</span>
                  )}
                </label>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : grievances.length === 0 ? (
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
        <div>
          {stepTemplates.map((template) =>
            renderSection(template.stepNumber, grievancesByStep.get(template.stepNumber) || [])
          )}
          {renderSection("none", grievancesByStep.get("none") || [])}
          {renderSection("resolved", grievancesByStep.get("resolved") || [])}
        </div>
      )}
    </div>
  );
}
