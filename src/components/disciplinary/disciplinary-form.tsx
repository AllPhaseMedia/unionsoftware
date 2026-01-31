"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { disciplinarySchema, type DisciplinaryInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { CalendarIcon, Loader2, FileText, Save, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Member, User, Department } from "@/types";

interface DisciplinarySnippet {
  id: string;
  name: string;
  content: string;
  category: "INVESTIGATION" | "INTERVIEW" | "RESOLUTION" | "GENERAL";
  isActive: boolean;
}

interface DisciplinaryCase {
  id: string;
  memberId: string | null;
  representativeId: string | null;
  departmentId: string | null;
  type: "ATTENDANCE" | "PERFORMANCE" | "CONDUCT" | "POLICY_VIOLATION" | "SAFETY" | "OTHER";
  description: string;
  incidentDate: Date | string | null;
  memberJobTitle: string | null;
  supervisorName: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  filingDate: Date | string;
}

interface DisciplinaryFormProps {
  disciplinaryCase?: DisciplinaryCase;
  members: Member[];
  users: User[];
  departments: Department[];
  onSubmit: (data: DisciplinaryInput) => Promise<void>;
  isLoading?: boolean;
  preselectedMemberId?: string;
}

export function DisciplinaryForm({
  disciplinaryCase,
  members,
  users,
  departments,
  onSubmit,
  isLoading,
  preselectedMemberId,
}: DisciplinaryFormProps) {
  const [snippets, setSnippets] = useState<DisciplinarySnippet[]>([]);
  const [snippetsLoading, setSnippetsLoading] = useState(true);
  const [saveSnippetDialogOpen, setSaveSnippetDialogOpen] = useState(false);
  const [saveSnippetCategory, setSaveSnippetCategory] = useState<DisciplinarySnippet["category"]>("GENERAL");
  const [saveSnippetName, setSaveSnippetName] = useState("");
  const [saveSnippetContent, setSaveSnippetContent] = useState("");
  const [savingSnippet, setSavingSnippet] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<DisciplinaryInput>({
    resolver: zodResolver(disciplinarySchema),
    defaultValues: {
      memberId: disciplinaryCase?.memberId || preselectedMemberId || null,
      representativeId: disciplinaryCase?.representativeId || null,
      departmentId: disciplinaryCase?.departmentId || null,
      type: disciplinaryCase?.type || "OTHER",
      description: disciplinaryCase?.description || "",
      incidentDate: disciplinaryCase?.incidentDate
        ? new Date(disciplinaryCase.incidentDate)
        : null,
      memberJobTitle: disciplinaryCase?.memberJobTitle || "",
      supervisorName: disciplinaryCase?.supervisorName || "",
      contractArticleIds: [],
      priority: disciplinaryCase?.priority || "MEDIUM",
      filingDate: disciplinaryCase?.filingDate
        ? new Date(disciplinaryCase.filingDate)
        : new Date(),
    },
  });

  const filingDate = watch("filingDate");
  const incidentDate = watch("incidentDate");
  const memberId = watch("memberId");
  const representativeId = watch("representativeId");
  const departmentId = watch("departmentId");
  const priority = watch("priority");
  const description = watch("description");

  // Fetch snippets on mount
  useEffect(() => {
    const fetchSnippets = async () => {
      try {
        const res = await fetch("/api/settings/disciplinary/snippets");
        if (res.ok) {
          const data = await res.json();
          setSnippets((data.data || []).filter((s: DisciplinarySnippet) => s.isActive));
        }
      } catch (err) {
        console.error("Failed to fetch snippets:", err);
      } finally {
        setSnippetsLoading(false);
      }
    };
    fetchSnippets();
  }, []);

  // Auto-fill member data when member is selected
  useEffect(() => {
    if (memberId) {
      const selectedMember = members.find(m => m.id === memberId) as Member & { department?: { id: string; name: string } };
      if (selectedMember) {
        // Auto-fill department from member (check both departmentId and department.id)
        const memberDeptId = selectedMember.departmentId || selectedMember.department?.id;
        if (memberDeptId) {
          setValue("departmentId", memberDeptId);

          // Get commissioner from member's department
          const dept = departments.find(d => d.id === memberDeptId);
          if (dept?.commissionerName) {
            setValue("supervisorName", dept.commissionerName);
          }
        }

        // Auto-fill job title from member
        if (selectedMember.jobTitle) {
          setValue("memberJobTitle", selectedMember.jobTitle);
        }
      }
    }
  }, [memberId, members, departments, setValue]);

  // Update supervisor when department changes
  useEffect(() => {
    if (departmentId) {
      const dept = departments.find(d => d.id === departmentId);
      const currentSupervisor = watch("supervisorName");
      if (dept?.commissionerName && (!currentSupervisor || !disciplinaryCase)) {
        setValue("supervisorName", dept.commissionerName);
      }
    }
  }, [departmentId, departments, setValue, disciplinaryCase, watch]);

  // Handle pre-selected member
  useEffect(() => {
    if (preselectedMemberId && !disciplinaryCase) {
      setValue("memberId", preselectedMemberId);
    }
  }, [preselectedMemberId, setValue, disciplinaryCase]);

  // Handle snippet selection
  const handleSnippetSelect = (snippet: DisciplinarySnippet) => {
    const currentValue = getValues("description");
    if (!currentValue || currentValue.trim() === "") {
      setValue("description", snippet.content);
    } else {
      setValue("description", currentValue + "\n\n" + snippet.content);
    }
  };

  // Open save snippet dialog
  const openSaveSnippetDialog = () => {
    if (!description || description.trim() === "") {
      return;
    }
    setSaveSnippetContent(description);
    setSaveSnippetName("");
    setSaveSnippetCategory("GENERAL");
    setSaveSnippetDialogOpen(true);
  };

  // Save new snippet
  const handleSaveSnippet = async () => {
    if (!saveSnippetName.trim() || !saveSnippetContent.trim()) return;

    try {
      setSavingSnippet(true);
      const res = await fetch("/api/settings/disciplinary/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveSnippetName,
          content: saveSnippetContent,
          category: saveSnippetCategory,
          isActive: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSnippets(prev => [...prev, data.data]);
        setSaveSnippetDialogOpen(false);
      }
    } catch (err) {
      console.error("Failed to save snippet:", err);
    } finally {
      setSavingSnippet(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Member and Representative */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Member</Label>
            <Select
              value={memberId || ""}
              onValueChange={(value) =>
                setValue("memberId", value || null, { shouldValidate: true })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select member (optional)" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.firstName} {member.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Representative</Label>
            <Select
              value={representativeId || ""}
              onValueChange={(value) =>
                setValue("representativeId", value || null, { shouldValidate: true })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Assign representative" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Department */}
        <div className="space-y-2">
          <Label>Department</Label>
          <Select
            value={departmentId || ""}
            onValueChange={(value) =>
              setValue("departmentId", value || null, { shouldValidate: true })
            }
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label>Priority *</Label>
          <Select
            value={priority}
            onValueChange={(value) =>
              setValue("priority", value as DisciplinaryInput["priority"], {
                shouldValidate: true,
              })
            }
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
          {errors.priority && (
            <p className="text-sm text-red-500">{errors.priority.message}</p>
          )}
        </div>

        {/* Job Title and Supervisor */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="memberJobTitle">Member Job Title</Label>
            <Input
              id="memberJobTitle"
              {...register("memberJobTitle")}
              disabled={isLoading}
              placeholder="Auto-filled from member"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supervisorName">Commissioner Name</Label>
            <Input
              id="supervisorName"
              {...register("supervisorName")}
              disabled={isLoading}
              placeholder="Auto-filled from department"
            />
          </div>
        </div>

        {/* Filing Date and Incident Date */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Filing Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filingDate && "text-muted-foreground"
                  )}
                  disabled={isLoading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filingDate ? format(filingDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filingDate}
                  onSelect={(date) =>
                    setValue("filingDate", date || new Date(), { shouldValidate: true })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.filingDate && (
              <p className="text-sm text-red-500">{errors.filingDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Incident Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !incidentDate && "text-muted-foreground"
                  )}
                  disabled={isLoading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {incidentDate ? format(incidentDate, "PPP") : "Pick a date (optional)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={incidentDate || undefined}
                  onSelect={(date) =>
                    setValue("incidentDate", date || null, { shouldValidate: true })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Description with Snippets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description">Description *</Label>
            <div className="flex items-center gap-2">
              {snippets.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" disabled={snippetsLoading}>
                      <FileText className="h-4 w-4 mr-1" />
                      Insert Snippet
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 max-h-64 overflow-y-auto">
                    <DropdownMenuLabel>Disciplinary Snippets</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {snippets.map((snippet) => (
                      <DropdownMenuItem
                        key={snippet.id}
                        onClick={() => handleSnippetSelect(snippet)}
                        className="cursor-pointer"
                      >
                        <div className="truncate">
                          <span className="font-medium">{snippet.name}</span>
                          <p className="text-xs text-gray-500 truncate">
                            {snippet.content.substring(0, 50)}...
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {description && description.trim() && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={openSaveSnippetDialog}
                  title="Save as Snippet"
                >
                  <Save className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <Textarea
            id="description"
            {...register("description")}
            disabled={isLoading}
            rows={5}
            placeholder="Describe the disciplinary issue or use a snippet..."
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {disciplinaryCase ? "Update Case" : "Create Case"}
          </Button>
        </div>
      </form>

      {/* Save Snippet Dialog */}
      <Dialog open={saveSnippetDialogOpen} onOpenChange={setSaveSnippetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Snippet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="snippetName">Snippet Name *</Label>
              <Input
                id="snippetName"
                value={saveSnippetName}
                onChange={(e) => setSaveSnippetName(e.target.value)}
                placeholder="e.g., Standard Attendance Warning"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={saveSnippetCategory} onValueChange={(v) => setSaveSnippetCategory(v as DisciplinarySnippet["category"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INVESTIGATION">Investigation</SelectItem>
                  <SelectItem value="INTERVIEW">Interview</SelectItem>
                  <SelectItem value="RESOLUTION">Resolution</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content Preview</Label>
              <div className="text-sm p-3 bg-gray-50 rounded-md border max-h-40 overflow-y-auto whitespace-pre-wrap">
                {saveSnippetContent}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveSnippetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSnippet}
              disabled={savingSnippet || !saveSnippetName.trim()}
            >
              {savingSnippet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Snippet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
