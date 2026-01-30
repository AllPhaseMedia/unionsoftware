"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { grievanceSchema, type GrievanceInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import type { Grievance, Member, User, Department, ContractWithArticles } from "@/types";

interface TextSnippet {
  id: string;
  name: string;
  content: string;
  category: "DESCRIPTION" | "RELIEF_REQUESTED";
  isActive: boolean;
}

interface GrievanceFormProps {
  grievance?: Grievance;
  members: Member[];
  users: User[];
  departments: Department[];
  contracts?: ContractWithArticles[];
  onSubmit: (data: GrievanceInput) => Promise<void>;
  isLoading?: boolean;
  preselectedMemberId?: string;
}

export function GrievanceForm({
  grievance,
  members,
  users,
  departments,
  contracts = [],
  onSubmit,
  isLoading,
  preselectedMemberId,
}: GrievanceFormProps) {
  const [snippets, setSnippets] = useState<TextSnippet[]>([]);
  const [snippetsLoading, setSnippetsLoading] = useState(true);
  const [saveSnippetDialogOpen, setSaveSnippetDialogOpen] = useState(false);
  const [saveSnippetCategory, setSaveSnippetCategory] = useState<"DESCRIPTION" | "RELIEF_REQUESTED">("DESCRIPTION");
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
  } = useForm<GrievanceInput>({
    resolver: zodResolver(grievanceSchema),
    defaultValues: {
      memberId: grievance?.memberId || preselectedMemberId || null,
      representativeId: grievance?.representativeId || null,
      departmentId: grievance?.departmentId || null,
      description: grievance?.description || "",
      reliefRequested: grievance?.reliefRequested || "",
      memberJobTitle: grievance?.memberJobTitle || "",
      commissionerName: grievance?.commissionerName || "",
      contractArticleIds: [],
      priority: grievance?.priority || "MEDIUM",
      filingDate: grievance?.filingDate
        ? new Date(grievance.filingDate)
        : new Date(),
    },
  });

  const filingDate = watch("filingDate");
  const memberId = watch("memberId");
  const representativeId = watch("representativeId");
  const departmentId = watch("departmentId");
  const priority = watch("priority");
  const selectedArticleIds = watch("contractArticleIds") || [];
  const description = watch("description");
  const reliefRequested = watch("reliefRequested");

  // Fetch snippets on mount
  useEffect(() => {
    const fetchSnippets = async () => {
      try {
        const res = await fetch("/api/snippets");
        if (res.ok) {
          const data = await res.json();
          setSnippets((data.data || []).filter((s: TextSnippet) => s.isActive));
        }
      } catch (err) {
        console.error("Failed to fetch snippets:", err);
      } finally {
        setSnippetsLoading(false);
      }
    };
    fetchSnippets();
  }, []);

  // Get all articles from active contracts
  const allArticles = useMemo(() => {
    return contracts
      .filter(c => c.isActive)
      .flatMap(contract =>
        contract.articles.map(article => ({
          ...article,
          contractName: contract.name,
        }))
      );
  }, [contracts]);

  // Filter snippets by category
  const descriptionSnippets = snippets.filter(s => s.category === "DESCRIPTION");
  const reliefSnippets = snippets.filter(s => s.category === "RELIEF_REQUESTED");

  // Auto-fill member data when member is selected
  useEffect(() => {
    if (memberId && !grievance) {
      const selectedMember = members.find(m => m.id === memberId);
      if (selectedMember) {
        // Auto-fill department from member
        if (selectedMember.departmentId) {
          setValue("departmentId", selectedMember.departmentId);

          // Get commissioner from department
          const dept = departments.find(d => d.id === selectedMember.departmentId);
          if (dept?.commissionerName) {
            setValue("commissionerName", dept.commissionerName);
          }
        }

        // Auto-fill job title from member
        if (selectedMember.jobTitle) {
          setValue("memberJobTitle", selectedMember.jobTitle);
        }
      }
    }
  }, [memberId, members, departments, setValue, grievance]);

  // Update commissioner when department changes
  useEffect(() => {
    if (departmentId && !grievance) {
      const dept = departments.find(d => d.id === departmentId);
      if (dept?.commissionerName) {
        setValue("commissionerName", dept.commissionerName);
      }
    }
  }, [departmentId, departments, setValue, grievance]);

  // Handle pre-selected member
  useEffect(() => {
    if (preselectedMemberId && !grievance) {
      setValue("memberId", preselectedMemberId);
    }
  }, [preselectedMemberId, setValue, grievance]);

  // Handle article selection
  const handleArticleToggle = (articleId: string, checked: boolean) => {
    const current = selectedArticleIds || [];
    if (checked) {
      setValue("contractArticleIds", [...current, articleId]);
    } else {
      setValue("contractArticleIds", current.filter(id => id !== articleId));
    }
  };

  // Build description from selected contract articles
  const buildDescriptionFromArticles = () => {
    if (selectedArticleIds.length === 0) return;

    const selectedArticles = allArticles.filter(a => selectedArticleIds.includes(a.id));
    const newDescription = selectedArticles
      .map(a => `${a.contractName} - Article ${a.articleNumber}: ${a.title}\n${a.content}`)
      .join("\n\n");

    setValue("description", newDescription);
  };

  // Handle snippet selection
  const handleSnippetSelect = (snippet: TextSnippet, field: "description" | "reliefRequested") => {
    const currentValue = getValues(field);
    // If field is empty, just set the snippet content. Otherwise, append it.
    if (!currentValue || currentValue.trim() === "") {
      setValue(field, snippet.content);
    } else {
      setValue(field, currentValue + "\n\n" + snippet.content);
    }
  };

  // Open save snippet dialog
  const openSaveSnippetDialog = (category: "DESCRIPTION" | "RELIEF_REQUESTED") => {
    const content = category === "DESCRIPTION" ? description : reliefRequested;
    if (!content || content.trim() === "") {
      return;
    }
    setSaveSnippetCategory(category);
    setSaveSnippetContent(content);
    setSaveSnippetName("");
    setSaveSnippetDialogOpen(true);
  };

  // Save new snippet
  const handleSaveSnippet = async () => {
    if (!saveSnippetName.trim() || !saveSnippetContent.trim()) return;

    try {
      setSavingSnippet(true);
      const res = await fetch("/api/snippets", {
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
                    {member.jobTitle && ` - ${member.jobTitle}`}
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

        {/* Department and Priority */}
        <div className="grid gap-4 md:grid-cols-2">
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
                    {dept.commissionerName && ` (${dept.commissionerName})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Priority *</Label>
            <Select
              value={priority}
              onValueChange={(value) =>
                setValue("priority", value as GrievanceInput["priority"], {
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
        </div>

        {/* Job Title and Commissioner (auto-filled) */}
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
            <Label htmlFor="commissionerName">Commissioner Name</Label>
            <Input
              id="commissionerName"
              {...register("commissionerName")}
              disabled={isLoading}
              placeholder="Auto-filled from department"
            />
          </div>
        </div>

        {/* Filing Date */}
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

        {/* Contract Articles Selection */}
        {contracts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Contract Articles Violated</Label>
              {selectedArticleIds.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={buildDescriptionFromArticles}
                >
                  Copy to Description
                </Button>
              )}
            </div>
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
              <Accordion type="multiple" className="w-full">
                {contracts.filter(c => c.isActive).map((contract) => (
                  <AccordionItem key={contract.id} value={contract.id}>
                    <AccordionTrigger className="text-sm">
                      {contract.name}
                      {selectedArticleIds.some(id =>
                        contract.articles.some(a => a.id === id)
                      ) && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          {contract.articles.filter(a => selectedArticleIds.includes(a.id)).length} selected
                        </span>
                      )}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pl-4">
                        {contract.articles.map((article) => (
                          <div key={article.id} className="flex items-start gap-2">
                            <Checkbox
                              id={article.id}
                              checked={selectedArticleIds.includes(article.id)}
                              onCheckedChange={(checked) =>
                                handleArticleToggle(article.id, checked === true)
                              }
                            />
                            <label
                              htmlFor={article.id}
                              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              <span className="font-medium">Article {article.articleNumber}:</span>{" "}
                              {article.title}
                            </label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {contracts.filter(c => c.isActive).length === 0 && (
                <p className="text-sm text-gray-500">No active contracts available.</p>
              )}
            </div>
          </div>
        )}

        {/* Description with Snippets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description">Description / Contract Violations *</Label>
            <div className="flex items-center gap-2">
              {descriptionSnippets.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" disabled={snippetsLoading}>
                      <FileText className="h-4 w-4 mr-1" />
                      Insert Snippet
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 max-h-64 overflow-y-auto">
                    <DropdownMenuLabel>Description Snippets</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {descriptionSnippets.map((snippet) => (
                      <DropdownMenuItem
                        key={snippet.id}
                        onClick={() => handleSnippetSelect(snippet, "description")}
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
                  onClick={() => openSaveSnippetDialog("DESCRIPTION")}
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
            placeholder="Describe the grievance or select contract articles above and click 'Copy to Description', or use a snippet..."
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>

        {/* Relief Requested with Snippets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="reliefRequested">Relief Requested</Label>
            <div className="flex items-center gap-2">
              {reliefSnippets.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" disabled={snippetsLoading}>
                      <FileText className="h-4 w-4 mr-1" />
                      Insert Snippet
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 max-h-64 overflow-y-auto">
                    <DropdownMenuLabel>Relief Requested Snippets</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {reliefSnippets.map((snippet) => (
                      <DropdownMenuItem
                        key={snippet.id}
                        onClick={() => handleSnippetSelect(snippet, "reliefRequested")}
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
              {reliefRequested && reliefRequested.trim() && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => openSaveSnippetDialog("RELIEF_REQUESTED")}
                  title="Save as Snippet"
                >
                  <Save className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <Textarea
            id="reliefRequested"
            {...register("reliefRequested")}
            disabled={isLoading}
            rows={3}
            placeholder="What remedy or outcome is being requested?"
          />
        </div>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {grievance ? "Update Grievance" : "Create Grievance"}
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
                placeholder="e.g., Standard Overtime Violation"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <p className="text-sm text-gray-500">
                {saveSnippetCategory === "DESCRIPTION" ? "Description" : "Relief Requested"}
              </p>
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
