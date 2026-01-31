"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Department } from "@/types";

interface RecipientSelectorProps {
  departments: Department[];
  value: {
    departments?: string[];
    statuses?: string[];
    employmentTypes?: string[];
  };
  onChange: (value: {
    departments?: string[];
    statuses?: string[];
    employmentTypes?: string[];
  }) => void;
}

const MEMBER_STATUSES = [
  { value: "MEMBER", label: "Member" },
  { value: "NON_MEMBER", label: "Non-Member" },
  { value: "SEVERED", label: "Severed" },
];

const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "PART_TIME", label: "Part Time" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "SEASONAL", label: "Seasonal" },
];

export function RecipientSelector({ departments, value, onChange }: RecipientSelectorProps) {
  const toggleDepartment = (deptId: string) => {
    const current = value.departments || [];
    const updated = current.includes(deptId)
      ? current.filter(id => id !== deptId)
      : [...current, deptId];
    onChange({ ...value, departments: updated.length > 0 ? updated : undefined });
  };

  const toggleStatus = (status: string) => {
    const current = value.statuses || [];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onChange({ ...value, statuses: updated.length > 0 ? updated : undefined });
  };

  const toggleEmploymentType = (type: string) => {
    const current = value.employmentTypes || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    onChange({ ...value, employmentTypes: updated.length > 0 ? updated : undefined });
  };

  const hasNoFilters = !value.departments?.length && !value.statuses?.length && !value.employmentTypes?.length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {hasNoFilters
          ? "All members with email addresses will receive this campaign."
          : "Only members matching the selected criteria will receive this campaign."}
      </p>

      {/* Member Status */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Member Status</Label>
        <div className="space-y-2">
          {MEMBER_STATUSES.map((status) => (
            <label
              key={status.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={value.statuses?.includes(status.value) || false}
                onCheckedChange={() => toggleStatus(status.value)}
              />
              <span className="text-sm">{status.label}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Employment Type */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Employment Type</Label>
        <div className="space-y-2">
          {EMPLOYMENT_TYPES.map((type) => (
            <label
              key={type.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={value.employmentTypes?.includes(type.value) || false}
                onCheckedChange={() => toggleEmploymentType(type.value)}
              />
              <span className="text-sm">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {departments.length > 0 && (
        <>
          <Separator />

          {/* Departments */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Departments</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {departments.map((dept) => (
                <label
                  key={dept.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={value.departments?.includes(dept.id) || false}
                    onCheckedChange={() => toggleDepartment(dept.id)}
                  />
                  <span className="text-sm">{dept.name}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
