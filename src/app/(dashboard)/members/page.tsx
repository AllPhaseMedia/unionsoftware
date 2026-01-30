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
import { Plus, Search, Settings2, ChevronLeft, ChevronRight, Loader2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickNote } from "@/components/ui/quick-note";
import type { Member, Department } from "@/types";

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
  accessor: (member: Member) => string;
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

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Search and filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<string>("all");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Column customization - initialize with defaults to avoid hydration mismatch
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [columnOrder, setColumnOrder] = useState<string[]>(ALL_COLUMNS.map(c => c.id));
  const [isHydrated, setIsHydrated] = useState(false);

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

  // Save column preferences (only after hydration to avoid overwriting with defaults)
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

  // Fetch departments on mount
  useEffect(() => {
    fetch("/api/departments")
      .then((res) => res.json())
      .then((data) => setDepartments(data.data || []))
      .catch(console.error);
  }, []);

  // Fetch members with debounced search
  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (departmentFilter !== "all") params.set("departmentId", departmentFilter);
      if (employmentTypeFilter !== "all") params.set("employmentType", employmentTypeFilter);

      const response = await fetch(`/api/members?${params.toString()}`);
      const data = await response.json();
      setMembers(data.data || []);
      setTotal(data.data?.length || 0);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, departmentFilter, employmentTypeFilter]);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchMembers();
      setPage(1);
    }, 150);
    return () => clearTimeout(timeout);
  }, [fetchMembers]);

  // Get ordered and visible columns
  const displayColumns = useMemo(() => {
    return columnOrder
      .filter(id => visibleColumns.includes(id))
      .map(id => ALL_COLUMNS.find(c => c.id === id)!)
      .filter(Boolean);
  }, [columnOrder, visibleColumns]);

  // Paginated members
  const paginatedMembers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return members.slice(start, start + pageSize);
  }, [members, page, pageSize]);

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

      // Don't allow moving before the locked "name" column
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
            placeholder="Search by name, email, member ID..."
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
            <SelectItem value="MEMBER">Member</SelectItem>
            <SelectItem value="NON_MEMBER">Non-Member</SelectItem>
            <SelectItem value="SEVERED">Severed</SelectItem>
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

        <Select value={employmentTypeFilter} onValueChange={setEmploymentTypeFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Employment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="FULL_TIME">Full Time</SelectItem>
            <SelectItem value="PART_TIME">Part Time</SelectItem>
            <SelectItem value="TEMPORARY">Temporary</SelectItem>
            <SelectItem value="SEASONAL">Seasonal</SelectItem>
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
            ) : paginatedMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={displayColumns.length} className="text-center py-8 text-gray-500">
                  No members found.
                  {search && " Try adjusting your search."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedMembers.map((member) => (
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
