"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { grievanceSchema, type GrievanceInput } from "@/lib/validations";
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
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Grievance, Member, User, Department } from "@/types";

interface GrievanceFormProps {
  grievance?: Grievance;
  members: Member[];
  users: User[];
  departments: Department[];
  onSubmit: (data: GrievanceInput) => Promise<void>;
  isLoading?: boolean;
}

export function GrievanceForm({
  grievance,
  members,
  users,
  departments,
  onSubmit,
  isLoading,
}: GrievanceFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GrievanceInput>({
    resolver: zodResolver(grievanceSchema),
    defaultValues: {
      memberId: grievance?.memberId || null,
      representativeId: grievance?.representativeId || null,
      departmentId: grievance?.departmentId || null,
      description: grievance?.description || "",
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          {...register("description")}
          disabled={isLoading}
          rows={5}
          placeholder="Describe the grievance in detail..."
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {grievance ? "Update Grievance" : "Create Grievance"}
        </Button>
      </div>
    </form>
  );
}
