"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Code } from "lucide-react";

interface VariablePickerProps {
  onSelect: (variable: string) => void;
}

const VARIABLES = [
  {
    category: "Member",
    items: [
      { label: "Full Name", value: "{{member.name}}" },
      { label: "First Name", value: "{{member.first_name}}" },
      { label: "Last Name", value: "{{member.last_name}}" },
      { label: "Email", value: "{{member.email}}" },
      { label: "Job Title", value: "{{member.job_title}}" },
      { label: "Department", value: "{{member.department}}" },
      { label: "Status", value: "{{member.status}}" },
    ],
  },
  {
    category: "Organization",
    items: [
      { label: "Organization Name", value: "{{organization.name}}" },
    ],
  },
  {
    category: "Date",
    items: [
      { label: "Current Date", value: "{{current_date}}" },
    ],
  },
];

export function VariablePicker({ onSelect }: VariablePickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Code className="h-4 w-4 mr-2" />
          Insert Variable
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {VARIABLES.map((group, index) => (
          <div key={group.category}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{group.category}</DropdownMenuLabel>
            {group.items.map((item) => (
              <DropdownMenuItem
                key={item.value}
                onClick={() => onSelect(item.value)}
              >
                <span className="flex-1">{item.label}</span>
                <code className="text-xs text-gray-500 bg-gray-100 px-1 rounded">
                  {item.value}
                </code>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
