import type {
  Organization,
  User,
  Member,
  Grievance,
  GrievanceStep,
  GrievanceNote,
  GrievanceMessage,
  Department,
  Contract,
  ContractArticle,
  CustomField,
  Document,
  MemberDocument,
  MemberNote,
  StepTemplate,
  PdfTemplate,
  EmailTemplate,
  AuditLog,
  UserNotification,
  EmailCampaign,
  CampaignEmail,
  EmailOpen,
  EmailClick,
  DisciplinaryCase,
  DisciplinaryStep,
  DisciplinaryNote,
  DisciplinaryMessage,
  DisciplinaryDocument,
  DisciplinaryStepTemplate,
  DisciplinarySnippet,
  DisciplinaryContractViolation,
  UserRole,
  MemberStatus,
  EmploymentType,
  GrievanceStatus,
  Priority,
  GrievanceOutcome,
  StepStatus,
  EntityType,
  FieldType,
  EmailTemplateCategory,
  AuditAction,
  CampaignStatus,
  EmailStatus,
  DisciplinaryStatus,
  DisciplinaryOutcome,
  DisciplinaryType,
  DisciplinarySnippetCategory,
} from "@prisma/client";

// Re-export Prisma types
export type {
  Organization,
  User,
  Member,
  Grievance,
  GrievanceStep,
  GrievanceNote,
  GrievanceMessage,
  Department,
  Contract,
  ContractArticle,
  CustomField,
  Document,
  MemberDocument,
  MemberNote,
  StepTemplate,
  PdfTemplate,
  EmailTemplate,
  AuditLog,
  UserNotification,
  EmailCampaign,
  CampaignEmail,
  EmailOpen,
  EmailClick,
  DisciplinaryCase,
  DisciplinaryStep,
  DisciplinaryNote,
  DisciplinaryMessage,
  DisciplinaryDocument,
  DisciplinaryStepTemplate,
  DisciplinarySnippet,
  DisciplinaryContractViolation,
};

export {
  UserRole,
  MemberStatus,
  EmploymentType,
  GrievanceStatus,
  Priority,
  GrievanceOutcome,
  StepStatus,
  EntityType,
  FieldType,
  EmailTemplateCategory,
  AuditAction,
  CampaignStatus,
  EmailStatus,
  DisciplinaryStatus,
  DisciplinaryOutcome,
  DisciplinaryType,
  DisciplinarySnippetCategory,
};

// Extended types with relations
export interface GrievanceWithRelations extends Grievance {
  member?: Member | null;
  representative?: User | null;
  createdBy: User;
  department?: Department | null;
  steps: GrievanceStep[];
  notes: GrievanceNote[];
  messages: GrievanceMessageWithUser[];
  documents: Document[];
  contractViolations: ContractViolationWithArticle[];
}

export interface GrievanceMessageWithUser extends GrievanceMessage {
  user: User;
  replies?: GrievanceMessageWithUser[];
}

export interface ContractViolationWithArticle {
  id: string;
  grievanceId: string;
  contractArticleId: string;
  notes: string | null;
  createdAt: Date;
  contractArticle: ContractArticle & {
    contract: Contract;
  };
}

export interface MemberWithRelations extends Member {
  department?: Department | null;
  grievances: Grievance[];
  notes: MemberNoteWithUser[];
  documents: MemberDocument[];
}

export interface MemberNoteWithUser extends MemberNote {
  user: User;
}

export interface GrievanceNoteWithUser extends GrievanceNote {
  user: User;
}

export interface ContractWithArticles extends Contract {
  articles: ContractArticle[];
}

export interface UserWithOrganization extends User {
  organization: Organization;
}

// Session/Auth types
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

// Dashboard stats
export interface DashboardStats {
  totalGrievances: number;
  openGrievances: number;
  resolvedGrievances: number;
  totalMembers: number;
  grievancesByStatus: { status: string; count: number }[];
  grievancesByPriority: { priority: string; count: number }[];
  recentGrievances: Grievance[];
  upcomingDeadlines: GrievanceStep[];
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form types
export interface GrievanceFormData {
  memberId?: string;
  representativeId?: string;
  departmentId?: string;
  description: string;
  priority: Priority;
  filingDate: Date;
  customFields?: Record<string, unknown>;
}

export interface MemberFormData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  hireDate?: Date;
  departmentId?: string;
  status: MemberStatus;
  employmentType?: EmploymentType;
  customFields?: Record<string, unknown>;
}

// Search/Filter types
export interface GrievanceFilters {
  status?: GrievanceStatus;
  priority?: Priority;
  departmentId?: string;
  representativeId?: string;
  memberId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface MemberFilters {
  status?: MemberStatus;
  departmentId?: string;
  employmentType?: EmploymentType;
  search?: string;
}

// Email Campaign types
export interface CampaignTargetCriteria {
  departments?: string[];
  statuses?: MemberStatus[];
  employmentTypes?: EmploymentType[];
}

export interface EmailCampaignWithRelations extends EmailCampaign {
  template?: EmailTemplate | null;
  createdBy: User;
  emails?: CampaignEmail[];
  _count?: {
    emails: number;
  };
}

export interface CampaignEmailWithMember extends CampaignEmail {
  member: Member;
}

export interface CampaignStats {
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  progress: number;
  // Tracking stats
  uniqueOpens: number;
  uniqueClicks: number;
  totalOpens: number;
  totalClicks: number;
  openRate: number;
  clickRate: number;
}

// Disciplinary types
export interface DisciplinaryMessageWithUser extends DisciplinaryMessage {
  user: User;
  replies?: DisciplinaryMessageWithUser[];
}

export interface DisciplinaryNoteWithUser extends DisciplinaryNote {
  user: User;
}

export interface DisciplinaryContractViolationWithArticle {
  id: string;
  caseId: string;
  contractArticleId: string;
  notes: string | null;
  createdAt: Date;
  contractArticle: ContractArticle & {
    contract: Contract;
  };
}

export interface DisciplinaryCaseWithRelations extends DisciplinaryCase {
  member?: Member | null;
  representative?: User | null;
  createdBy: User;
  department?: Department | null;
  steps: DisciplinaryStep[];
  notes: DisciplinaryNoteWithUser[];
  messages: DisciplinaryMessageWithUser[];
  documents: DisciplinaryDocument[];
  contractViolations: DisciplinaryContractViolationWithArticle[];
}

export interface DisciplinaryFilters {
  status?: DisciplinaryStatus;
  priority?: Priority;
  type?: DisciplinaryType;
  departmentId?: string;
  representativeId?: string;
  memberId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface DisciplinaryFormData {
  memberId?: string;
  representativeId?: string;
  departmentId?: string;
  description: string;
  type: DisciplinaryType;
  priority: Priority;
  incidentDate: Date;
  filingDate: Date;
  managementPosition?: string;
  unionResponse?: string;
}
