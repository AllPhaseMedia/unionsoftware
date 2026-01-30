"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { memberSchema, type MemberInput } from "@/lib/validations";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Member, Department } from "@/types";

// Format phone number as (xxx) xxx-xxxx
function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

// Format date as M/D/YYYY (no leading zeros)
function formatDateDisplay(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

// Parse date from string (M/D/YYYY or MM/DD/YYYY format)
function parseDateString(value: string): Date | null {
  const cleaned = value.replace(/[^0-9/]/g, "");
  const parts = cleaned.split("/");
  if (parts.length !== 3) return null;

  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;

  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return date;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface DateInputProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
  placeholder?: string;
  fromYear?: number;
  toYear?: number;
}

function DateInput({ value, onChange, disabled, placeholder = "M/D/YYYY", fromYear = 1920, toYear }: DateInputProps) {
  const currentYear = new Date().getFullYear();
  const endYear = toYear || currentYear;

  const [inputValue, setInputValue] = useState(value ? formatDateDisplay(value) : "");
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(value ? value.getMonth() : new Date().getMonth());
  const [viewYear, setViewYear] = useState(value ? value.getFullYear() : currentYear - 30);

  // Generate year options
  const years = [];
  for (let y = endYear; y >= fromYear; y--) {
    years.push(y);
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const parsed = parseDateString(val);
    if (parsed) {
      onChange(parsed);
      setViewMonth(parsed.getMonth());
      setViewYear(parsed.getFullYear());
    }
  };

  const handleInputBlur = () => {
    if (inputValue === "") {
      onChange(null);
      return;
    }

    const parsed = parseDateString(inputValue);
    if (parsed) {
      onChange(parsed);
      setInputValue(formatDateDisplay(parsed));
    } else if (value) {
      setInputValue(formatDateDisplay(value));
    } else {
      setInputValue("");
    }
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    onChange(newDate);
    setInputValue(formatDateDisplay(newDate));
    setIsOpen(false);
  };

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => Math.max(fromYear, y - 1));
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => Math.min(endYear, y + 1));
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const goToPrevYear = () => {
    setViewYear(y => Math.max(fromYear, y - 1));
  };

  const goToNextYear = () => {
    setViewYear(y => Math.min(endYear, y + 1));
  };

  // Get days in month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

  // Build calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  const isSelectedDay = (day: number | null) => {
    if (!day || !value) return false;
    return value.getDate() === day && value.getMonth() === viewMonth && value.getFullYear() === viewYear;
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;
  };

  return (
    <div className="flex gap-2">
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            className="shrink-0"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          {/* Year and Month Navigation */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={goToPrevYear}
                disabled={viewYear <= fromYear}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={goToPrevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={viewMonth.toString()}
                onValueChange={(val) => setViewMonth(parseInt(val, 10))}
              >
                <SelectTrigger className="h-8 w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={viewYear.toString()}
                onValueChange={(val) => setViewYear(parseInt(val, 10))}
              >
                <SelectTrigger className="h-8 w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={goToNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={goToNextYear}
                disabled={viewYear >= endYear}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="h-8 w-8 flex items-center justify-center text-xs font-medium text-gray-500">
                {day}
              </div>
            ))}
            {calendarDays.map((day, idx) => (
              <div key={idx} className="h-8 w-8">
                {day && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 text-sm font-normal",
                      isSelectedDay(day) && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                      isToday(day) && !isSelectedDay(day) && "border border-primary",
                    )}
                    onClick={() => handleDateSelect(day)}
                  >
                    {day}
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Today button */}
          <div className="mt-3 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                const today = new Date();
                onChange(today);
                setInputValue(formatDateDisplay(today));
                setViewMonth(today.getMonth());
                setViewYear(today.getFullYear());
                setIsOpen(false);
              }}
            >
              Today
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface MemberFormProps {
  member?: Member;
  departments: Department[];
}

export function MemberForm({
  member,
  departments,
}: MemberFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: MemberInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = member ? `/api/members/${member.id}` : "/api/members";
      const method = member ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save member");
      }

      const result = await response.json();
      router.push(`/members/${result.data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MemberInput>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      memberId: member?.memberId || "",
      firstName: member?.firstName || "",
      lastName: member?.lastName || "",
      email: member?.email || "",
      homePhone: member?.homePhone ? formatPhoneNumber(member.homePhone) : "",
      cellPhone: member?.cellPhone ? formatPhoneNumber(member.cellPhone) : "",
      address: member?.address || "",
      city: member?.city || "",
      state: member?.state || "",
      zipCode: member?.zipCode || "",
      dateOfBirth: member?.dateOfBirth ? new Date(member.dateOfBirth) : null,
      hireDate: member?.hireDate ? new Date(member.hireDate) : null,
      jobTitle: member?.jobTitle || "",
      workLocation: member?.workLocation || "",
      departmentId: member?.departmentId || null,
      status: member?.status || "MEMBER",
      employmentType: member?.employmentType || null,
    },
  });

  const dateOfBirth = watch("dateOfBirth");
  const hireDate = watch("hireDate");
  const status = watch("status");
  const employmentType = watch("employmentType");
  const departmentId = watch("departmentId");

  const handlePhoneChange = (field: "homePhone" | "cellPhone", value: string) => {
    const formatted = formatPhoneNumber(value);
    setValue(field, formatted, { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      {/* Member ID */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="memberId">Member ID</Label>
          <Input
            id="memberId"
            {...register("memberId")}
            disabled={isLoading}
            placeholder="Optional member ID"
          />
        </div>
      </div>

      {/* Name Fields */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            {...register("firstName")}
            disabled={isLoading}
          />
          {errors.firstName && (
            <p className="text-sm text-red-500">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input id="lastName" {...register("lastName")} disabled={isLoading} />
          {errors.lastName && (
            <p className="text-sm text-red-500">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <DateInput
            value={dateOfBirth ? new Date(dateOfBirth) : null}
            onChange={(date) => setValue("dateOfBirth", date, { shouldValidate: true })}
            disabled={isLoading}
            fromYear={1920}
            toYear={new Date().getFullYear()}
          />
        </div>
      </div>

      {/* Phone Numbers */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="homePhone">Home Phone</Label>
          <Input
            id="homePhone"
            {...register("homePhone")}
            onChange={(e) => handlePhoneChange("homePhone", e.target.value)}
            disabled={isLoading}
            placeholder="(xxx) xxx-xxxx"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cellPhone">Cell Phone</Label>
          <Input
            id="cellPhone"
            {...register("cellPhone")}
            onChange={(e) => handlePhoneChange("cellPhone", e.target.value)}
            disabled={isLoading}
            placeholder="(xxx) xxx-xxxx"
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" {...register("address")} disabled={isLoading} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...register("city")} disabled={isLoading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" {...register("state")} disabled={isLoading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zipCode">ZIP Code</Label>
          <Input id="zipCode" {...register("zipCode")} disabled={isLoading} />
        </div>
      </div>

      {/* Employment Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="jobTitle">Job Title</Label>
          <Input id="jobTitle" {...register("jobTitle")} disabled={isLoading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="workLocation">Work Location</Label>
          <Input
            id="workLocation"
            {...register("workLocation")}
            disabled={isLoading}
          />
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
          <Label>Hire Date</Label>
          <DateInput
            value={hireDate ? new Date(hireDate) : null}
            onChange={(date) => setValue("hireDate", date, { shouldValidate: true })}
            disabled={isLoading}
            fromYear={1950}
            toYear={new Date().getFullYear()}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Membership Status *</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              setValue("status", value as MemberInput["status"], {
                shouldValidate: true,
              })
            }
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MEMBER">Member</SelectItem>
              <SelectItem value="NON_MEMBER">Non-Member</SelectItem>
              <SelectItem value="SEVERED">Severed</SelectItem>
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="text-sm text-red-500">{errors.status.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Employment Type</Label>
          <Select
            value={employmentType || ""}
            onValueChange={(value) =>
              setValue(
                "employmentType",
                (value as MemberInput["employmentType"]) || null,
                { shouldValidate: true }
              )
            }
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FULL_TIME">Full Time</SelectItem>
              <SelectItem value="PART_TIME">Part Time</SelectItem>
              <SelectItem value="TEMPORARY">Temporary</SelectItem>
              <SelectItem value="SEASONAL">Seasonal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {member ? "Update Member" : "Create Member"}
        </Button>
      </div>
    </form>
  );
}
