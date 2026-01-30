import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import type { Grievance, Member, User, Department } from "@/types";

interface GrievanceCardProps {
  grievance: Grievance & {
    member?: Member | null;
    representative?: User | null;
    department?: Department | null;
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

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

export function GrievanceCard({ grievance }: GrievanceCardProps) {
  return (
    <Link href={`/grievances/${grievance.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-medium">{grievance.grievanceNumber}</h3>
            <div className="flex gap-2">
              <Badge className={priorityColors[grievance.priority]}>
                {grievance.priority}
              </Badge>
              <Badge className={statusColors[grievance.status]}>
                {grievance.status.replace("_", " ")}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {grievance.description}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex flex-col gap-1">
              {grievance.member && (
                <span>
                  Member: {grievance.member.firstName} {grievance.member.lastName}
                </span>
              )}
              {grievance.representative && (
                <span>Rep: {grievance.representative.name}</span>
              )}
            </div>
            <span>{format(new Date(grievance.filingDate), "MMM d, yyyy")}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
