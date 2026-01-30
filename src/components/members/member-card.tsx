import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Member, Department } from "@/types";

interface MemberCardProps {
  member: Member & { department?: Department | null };
}

const statusColors: Record<string, string> = {
  MEMBER: "bg-green-100 text-green-800",
  NON_MEMBER: "bg-gray-100 text-gray-800",
  SEVERED: "bg-red-100 text-red-800",
};

export function MemberCard({ member }: MemberCardProps) {
  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();

  return (
    <Link href={`/members/${member.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium truncate">
                  {member.firstName} {member.lastName}
                </h3>
                <Badge className={statusColors[member.status]}>
                  {member.status.replace("_", " ")}
                </Badge>
              </div>
              {member.email && (
                <p className="text-sm text-gray-500 truncate">{member.email}</p>
              )}
              {member.department && (
                <p className="text-sm text-gray-400">{member.department.name}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
