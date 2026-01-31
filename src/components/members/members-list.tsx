"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Plus, Search, Settings2, ChevronLeft, ChevronRight, Loader2, GripVertical, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickNote } from "@/components/ui/quick-note";
import type { Department } from "@/types";

// Member type for list view (only fields we need)
interface MemberListItem {
  id: string;
  memberId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  cellPhone: string | null;
  homePhone: string | null;
  jobTitle: string | null;
  workLocation: string | null;
  status: string;
  employmentType: string | null;
  hireDate: Date | string | null;
  dateOfBirth: Date | string | null;
  city: string | null;
  state: string | null;
  department: { id: string; name: string } | null;
}

interface MembersListProps {
  initialMembers: MemberListItem[];
  initialTotal: number;
  departments: Department[];
}

// Format date as M/D/YYYY
function formatDate(date: string | Date | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

// Format phone for display
function formatPhone(phone: string | null): string {
  if (!phone) return "-";
  return phone;
}

interface Column {
  id: string;
  label: string;
  accessor: (member: MemberListItem) => string;
  locked?: boolean;
}

const ALL_COLUMNS: Column[] = [
  {
    id: "name",
    label: "Name",
    accessor: (m) => `${m.lastName}, ${m.firstName}`,
    locked: true
  },
  { id: "memberId", label: "Member ID", accessor: (m) => m.memberId || "-" },
  { id: "email", label: "Email", accessor: (m) => m.email || "-" },
  { id: "cellPhone", label: "Cell Phone", accessor: (m) => formatPhone(m.cellPhone) },
  { id: "homePhone", label: "Home Phone", accessor: (m) => formatPhone(m.homePhone) },
  { id: "department", label: "Department", accessor: (m) => m.department?.name || "-" },
  { id: "jobTitle", label: "Job Title", accessor: (m) => m.jobTitle || "-" },
  { id: "workLocation", label: "Work Location", accessor: (m) => m.workLocation || "-" },
  { id: "status", label: "Status", accessor: (m) => m.status },
  { id: "employmentType", label: "Employment Type", accessor: (m) => m.employmentType?.replace("_", " ") || "-" },
  { id: "hireDate", label: "Hire Date", accessor: (m) => formatDate(m.hireDate) },
  { id: "dateOfBirth", label: "Date of Birth", accessor: (m) => formatDate(m.dateOfBirth) },
  { id: "city", label: "City", accessor: (m) => m.city || "-" },
  { id: "state", label: "State", accessor: (m) => m.state || "-" },
];

const DEFAULT_VISIBLE_COLUMNS = ["name", "memberId", "email", "cellPhone", "department", "status"];

export function MembersList({ initialMembers, initialTotal, departments }: MembersListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [members, setMembers] = useState<MemberListItem[]>(initialMembers);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(initialTotal);

  // Search and filters from URL (now supporting multiple selections)
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilters, setStatusFilters] = useState<string[]>(
    searchParams.get("statuses")?.split(",").filter(Boolean) || []
  );
  const [departmentFilters, setDepartmentFilters] = useState<string[]>(
    searchParams.get("departmentIds")?.split(",").filter(Boolean) || []
  );
  const [employmentTypeFilters, setEmploymentTypeFilters] = useState<string[]>(
    searchParams.get("employmentTypes")?.split(",").filter(Boolean) || []
  );

  // Pagination
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const pageSize = 50;

  // Column customization
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [columnOrder, setColumnOrder] = useState<string[]>(ALL_COLUMNS.map(c => c.id));
  const [isHydrated, setIsHydrated] = useState(false);

  // Track initial filter values to detect actual changes (not just hydration)
  const initialFilters = useRef({
    search: searchParams.get("search") || "",
    statuses: searchParams.get("statuses")?.split(",").filter(Boolean) || [],
    departments: searchParams.get("departmentIds")?.split(",").filter(Boolean) || [],
    employmentTypes: searchParams.get("employmentTypes")?.split(",").filter(Boolean) || [],
    page: parseInt(searchParams.get("page") || "1", 10),
  });
  const hasFetchedOnce = useRef(false);

  // Load saved column preferences from localStorage after hydration
  useEffect(() => {
    const savedColumns = localStorage.getItem("memberTableColumns");
    if (savedColumns) {
      try {
        setVisibleColumns(JSON.parse(savedColumns));
      } catch {
        // Keep defaults
      }
    }

    const savedOrder = localStorage.getItem("memberTableColumnOrder");
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
      localStorage.setItem("memberTableColumns", JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("memberTableColumnOrder", JSON.stringify(columnOrder));
    }
  }, [columnOrder, isHydrated]);

  // Fetch members when filters change
  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilters.length > 0) params.set("statuses", statusFilters.join(","));
      if (departmentFilters.length > 0) params.set("departmentIds", departmentFilters.join(","));
      if (employmentTypeFilters.length > 0) params.set("employmentTypes", employmentTypeFilters.join(","));
      params.set("page", String(page));
      params.set("limit", String(pageSize));

      const response = await fetch(`/api/members?${params.toString()}`);
      const data = await response.json();
      setMembers(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilters, departmentFilters, employmentTypeFilters, page, pageSize]);

  // Helper to compare arrays
  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((v, i) => v === sortedB[i]);
  };

  // Check if filters have actually changed from initial values
  const filtersChanged = () => {
    const init = initialFilters.current;
    return (
      search !== init.search ||
      !arraysEqual(statusFilters, init.statuses) ||
      !arraysEqual(departmentFilters, init.departments) ||
      !arraysEqual(employmentTypeFilters, init.employmentTypes) ||
      page !== init.page
    );
  };

  // Reset to page 1 when search filters change
  useEffect(() => {
    if (hasFetchedOnce.current) {
      setPage(1);
    }
  }, [search, statusFilters, departmentFilters, employmentTypeFilters]);

  // Fetch when filters or page change (only if they differ from initial server-rendered values)
  useEffect(() => {
    // Skip if filters match initial values (we already have server data)
    if (!filtersChanged()) {
      return;
    }

    hasFetchedOnce.current = true;
    const timeout = setTimeout(() => {
      fetchMembers();
    }, 150);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilters, departmentFilters, employmentTypeFilters, page]);

  // Get ordered and visible columns
  const displayColumns = useMemo(() => {
    return columnOrder
      .filter(id => visibleColumns.includes(id))
      .map(id => ALL_COLUMNS.find(c => c.id === id)!)
      .filter(Boolean);
  }, [columnOrder, visibleColumns]);

  const totalPages = Math.ceil(total / pageSize);

  const toggleColumn = (columnId: string) => {
    const column = ALL_COLUMNS.find(c => c.id === columnId);
    if (column?.locked) return;

    setVisibleColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "MEMBER":
        return <Badge variant="default">Member</Badge>;
      case "NON_MEMBER":
        return <Badge variant="secondary">Non-Member</Badge>;
      case "SEVERED":
        return <Badge variant="destructive">Severed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-gray-500">
            {total} member{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/members/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search all fields..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Multi-Select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[150px] justify-between">
              <span className="truncate">
                {statusFilters.length === 0
                  ? "All Statuses"
                  : statusFilters.length === 1
                  ? statusFilters[0].replace("_", " ")
                  : `${statusFilters.length} selected`}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[180px] p-2" align="start">
            <div className="space-y-1">
              {[
                { value: "MEMBER", label: "Member" },
                { value: "NON_MEMBER", label: "Non-Member" },
                { value: "SEVERED", label: "Severed" },
              ].map((status) => (
                <label
                  key={status.value}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <Checkbox
                    checked={statusFilters.includes(status.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setStatusFilters([...statusFilters, status.value]);
                      } else {
                        setStatusFilters(statusFilters.filter((s) => s !== status.value));
                      }
                    }}
                  />
                  <span className="text-sm">{status.label}</span>
                </label>
              ))}
              {statusFilters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1 text-gray-500"
                  onClick={() => setStatusFilters([])}
                >
                  Clear
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Department Multi-Select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[180px] justify-between">
              <span className="truncate">
                {departmentFilters.length === 0
                  ? "All Departments"
                  : departmentFilters.length === 1
                  ? departments.find((d) => d.id === departmentFilters[0])?.name || "1 selected"
                  : `${departmentFilters.length} selected`}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-2" align="start">
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {departments.map((dept) => (
                <label
                  key={dept.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <Checkbox
                    checked={departmentFilters.includes(dept.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setDepartmentFilters([...departmentFilters, dept.id]);
                      } else {
                        setDepartmentFilters(departmentFilters.filter((d) => d !== dept.id));
                      }
                    }}
                  />
                  <span className="text-sm truncate">{dept.name}</span>
                </label>
              ))}
              {departmentFilters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1 text-gray-500"
                  onClick={() => setDepartmentFilters([])}
                >
                  Clear
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Employment Type Multi-Select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[170px] justify-between">
              <span className="truncate">
                {employmentTypeFilters.length === 0
                  ? "All Types"
                  : employmentTypeFilters.length === 1
                  ? employmentTypeFilters[0].replace("_", " ")
                  : `${employmentTypeFilters.length} selected`}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[180px] p-2" align="start">
            <div className="space-y-1">
              {[
                { value: "FULL_TIME", label: "Full Time" },
                { value: "PART_TIME", label: "Part Time" },
                { value: "TEMPORARY", label: "Temporary" },
                { value: "SEASONAL", label: "Seasonal" },
              ].map((type) => (
                <label
                  key={type.value}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <Checkbox
                    checked={employmentTypeFilters.includes(type.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setEmploymentTypeFilters([...employmentTypeFilters, type.value]);
                      } else {
                        setEmploymentTypeFilters(employmentTypeFilters.filter((t) => t !== type.value));
                      }
                    }}
                  />
                  <span className="text-sm">{type.label}</span>
                </label>
              ))}
              {employmentTypeFilters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1 text-gray-500"
                  onClick={() => setEmploymentTypeFilters([])}
                >
                  Clear
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear All Filters */}
        {(statusFilters.length > 0 || departmentFilters.length > 0 || employmentTypeFilters.length > 0) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500"
            onClick={() => {
              setStatusFilters([]);
              setDepartmentFilters([]);
              setEmploymentTypeFilters([]);
            }}
          >
            <X className="h-4 w-4 mr-1" />
            Clear filters
          </Button>
        )}

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

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
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
                  className={cn(
                    "select-none",
                    !column.locked && "cursor-grab active:cursor-grabbing",
                    dragOverColumn === column.id && "bg-blue-50 border-l-2 border-blue-400",
                    draggedColumn === column.id && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-1">
                    {!column.locked && (
                      <GripVertical className="h-3 w-3 text-gray-400" />
                    )}
                    {column.label}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={displayColumns.length} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={displayColumns.length} className="text-center py-8 text-gray-500">
                  No members found.
                  {search && " Try adjusting your search."}
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id} className="hover:bg-gray-50">
                  {displayColumns.map((column) => (
                    <TableCell key={column.id}>
                      {column.id === "name" ? (
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/members/${member.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {column.accessor(member)}
                          </Link>
                          <QuickNote
                            entityType="member"
                            entityId={member.id}
                          />
                        </div>
                      ) : column.id === "status" ? (
                        getStatusBadge(member.status)
                      ) : (
                        column.accessor(member)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} members
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
