import { z } from "zod";

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Helper for optional date fields
const dateField = z.date().optional().nullable();

// Helper for API date fields that accept strings or dates
const apiDateField = z.union([
  z.date(),
  z.string().transform((val) => val ? new Date(val) : null),
  z.null(),
]).optional().nullable();

// Member schemas
export const memberSchema = z.object({
  memberId: z.string().optional().or(z.literal("")),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  homePhone: z.string().optional().or(z.literal("")),
  cellPhone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  zipCode: z.string().optional().or(z.literal("")),
  dateOfBirth: dateField,
  hireDate: dateField,
  jobTitle: z.string().optional().or(z.literal("")),
  workLocation: z.string().optional().or(z.literal("")),
  departmentId: z.string().optional().nullable().or(z.literal("")),
  status: z.enum(["MEMBER", "NON_MEMBER", "SEVERED"]),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "TEMPORARY", "SEASONAL"]).optional().nullable(),
  customFields: z.record(z.string(), z.any()).optional(),
});

// Schema for API requests (accepts date as string)
export const memberApiSchema = memberSchema.extend({
  dateOfBirth: apiDateField,
  hireDate: apiDateField,
});

// Grievance schemas
export const grievanceSchema = z.object({
  memberId: z.string().optional().nullable().or(z.literal("")),
  representativeId: z.string().optional().nullable().or(z.literal("")),
  departmentId: z.string().optional().nullable().or(z.literal("")),
  description: z.string().min(10, "Description must be at least 10 characters"),
  reliefRequested: z.string().optional().nullable().or(z.literal("")),
  memberJobTitle: z.string().optional().nullable().or(z.literal("")),
  commissionerName: z.string().optional().nullable().or(z.literal("")),
  contractArticleIds: z.array(z.string()).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  filingDate: z.date(),
  customFields: z.record(z.string(), z.any()).optional(),
});

// Schema for API requests (accepts date as string)
export const grievanceApiSchema = grievanceSchema.extend({
  filingDate: z.union([z.date(), z.string().transform((val) => new Date(val))]),
});

export const grievanceUpdateSchema = grievanceSchema.extend({
  status: z.enum(["OPEN", "IN_PROGRESS", "PENDING_RESPONSE", "RESOLVED", "CLOSED", "WITHDRAWN"]),
  outcome: z.enum(["WON", "LOST", "SETTLED", "WITHDRAWN", "PENDING_ARBITRATION"]).optional().nullable(),
  outcomeNotes: z.string().optional().nullable(),
  settlementAmount: z.number().optional().nullable(),
  reliefRequested: z.string().optional().nullable().or(z.literal("")),
});

// API version of update schema (accepts date as string)
export const grievanceUpdateApiSchema = grievanceApiSchema.extend({
  status: z.enum(["OPEN", "IN_PROGRESS", "PENDING_RESPONSE", "RESOLVED", "CLOSED", "WITHDRAWN"]),
  outcome: z.enum(["WON", "LOST", "SETTLED", "WITHDRAWN", "PENDING_ARBITRATION"]).optional().nullable(),
  outcomeNotes: z.string().optional().nullable(),
  settlementAmount: z.number().optional().nullable(),
  reliefRequested: z.string().optional().nullable().or(z.literal("")),
});

// Grievance step schema
export const grievanceStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  name: z.string().min(1, "Step name is required"),
  description: z.string().optional(),
  deadline: dateField,
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE", "SKIPPED"]),
  notes: z.string().optional(),
});

// Note schemas
export const noteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
  isInternal: z.boolean().default(false),
});

// Message schema
export const messageSchema = z.object({
  content: z.string().min(1, "Message content is required"),
  parentId: z.string().optional().nullable(),
});

// Department schema
export const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  code: z.string().optional().or(z.literal("")),
  commissionerName: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

// Step template schema
export const stepTemplateSchema = z.object({
  stepNumber: z.number().int().positive(),
  name: z.string().min(1, "Step name is required"),
  description: z.string().optional(),
  defaultDeadlineDays: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
});

// Contract schema
export const contractSchema = z.object({
  name: z.string().min(1, "Contract name is required"),
  effectiveDate: z.date(),
  expirationDate: z.date(),
  fileUrl: z.string().url().optional().nullable().or(z.literal("")),
  isActive: z.boolean().default(true),
});

// Schema for API requests (accepts date as string)
export const contractApiSchema = contractSchema.extend({
  effectiveDate: z.union([z.date(), z.string().transform((val) => new Date(val))]),
  expirationDate: z.union([z.date(), z.string().transform((val) => new Date(val))]),
});

// Contract article schema
export const contractArticleSchema = z.object({
  articleNumber: z.string().min(1, "Article number is required"),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});

// Custom field schema
export const customFieldSchema = z.object({
  entityType: z.enum(["GRIEVANCE", "MEMBER"]),
  fieldName: z.string().min(1, "Field name is required").regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Field name must be a valid identifier"),
  fieldLabel: z.string().min(1, "Field label is required"),
  fieldType: z.enum(["TEXT", "NUMBER", "DATE", "SELECT", "CHECKBOX", "TEXTAREA"]),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

// PDF template schema
export const pdfTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  content: z.string().min(1, "Template content is required"),
  isActive: z.boolean().default(true),
});

// Email template schema
export const emailTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  category: z.enum(["MEMBER_NOTIFICATION", "MANAGEMENT", "INTERNAL"]),
  isActive: z.boolean().default(true),
});

// User schema (for admin management)
export const userSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["ADMIN", "REPRESENTATIVE", "VIEWER"]),
  isActive: z.boolean().default(true),
});

// Campaign target criteria schema
export const campaignTargetCriteriaSchema = z.object({
  departments: z.array(z.string()).optional(),
  statuses: z.array(z.enum(["MEMBER", "NON_MEMBER", "SEVERED"])).optional(),
  employmentTypes: z.array(z.enum(["FULL_TIME", "PART_TIME", "TEMPORARY", "SEASONAL"])).optional(),
});

// Email campaign schema (for creating/updating)
export const emailCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  subject: z.string().min(1, "Email subject is required"),
  body: z.string().min(1, "Email body is required"),
  templateId: z.string().optional().nullable(),
  targetCriteria: campaignTargetCriteriaSchema.optional().nullable(),
  emailsPerMinute: z.number().int().min(1).max(500).default(50),
  scheduledAt: z.date().optional().nullable(),
});

// Campaign update schema (allows partial updates)
export const emailCampaignUpdateSchema = emailCampaignSchema.partial();

// Disciplinary schemas
export const disciplinarySchema = z.object({
  memberId: z.string().optional().nullable().or(z.literal("")),
  representativeId: z.string().optional().nullable().or(z.literal("")),
  departmentId: z.string().optional().nullable().or(z.literal("")),
  type: z.enum(["ATTENDANCE", "PERFORMANCE", "CONDUCT", "POLICY_VIOLATION", "SAFETY", "OTHER"]),
  description: z.string().min(10, "Description must be at least 10 characters"),
  incidentDate: dateField,
  memberJobTitle: z.string().optional().nullable().or(z.literal("")),
  supervisorName: z.string().optional().nullable().or(z.literal("")),
  contractArticleIds: z.array(z.string()).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  filingDate: z.date(),
  customFields: z.record(z.string(), z.any()).optional(),
});

// Schema for API requests (accepts date as string)
export const disciplinaryApiSchema = disciplinarySchema.extend({
  filingDate: z.union([z.date(), z.string().transform((val) => new Date(val))]),
  incidentDate: apiDateField,
});

export const disciplinaryUpdateSchema = disciplinarySchema.extend({
  status: z.enum(["OPEN", "IN_PROGRESS", "PENDING_REVIEW", "RESOLVED", "CLOSED"]),
  outcome: z.enum(["NO_ACTION", "VERBAL_WARNING", "WRITTEN_WARNING", "SUSPENSION", "TERMINATION", "OTHER"]).optional().nullable(),
  outcomeNotes: z.string().optional().nullable(),
});

// API version of update schema (accepts date as string)
export const disciplinaryUpdateApiSchema = disciplinaryApiSchema.extend({
  status: z.enum(["OPEN", "IN_PROGRESS", "PENDING_REVIEW", "RESOLVED", "CLOSED"]),
  outcome: z.enum(["NO_ACTION", "VERBAL_WARNING", "WRITTEN_WARNING", "SUSPENSION", "TERMINATION", "OTHER"]).optional().nullable(),
  outcomeNotes: z.string().optional().nullable(),
});

// Disciplinary step schema
export const disciplinaryStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  name: z.string().min(1, "Step name is required"),
  description: z.string().optional(),
  deadline: dateField,
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE", "SKIPPED"]),
  notes: z.string().optional(),
});

// Disciplinary step template schema
export const disciplinaryStepTemplateSchema = z.object({
  stepNumber: z.number().int().positive(),
  name: z.string().min(1, "Step name is required"),
  description: z.string().optional(),
  defaultDeadlineDays: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
});

// Disciplinary snippet schema
export const disciplinarySnippetSchema = z.object({
  name: z.string().min(1, "Snippet name is required"),
  content: z.string().min(1, "Snippet content is required"),
  category: z.enum(["INVESTIGATION", "INTERVIEW", "RESOLUTION", "GENERAL"]),
  isActive: z.boolean().default(true),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type MemberInput = z.infer<typeof memberSchema>;
export type GrievanceInput = z.infer<typeof grievanceSchema>;
export type GrievanceUpdateInput = z.infer<typeof grievanceUpdateSchema>;
export type GrievanceStepInput = z.infer<typeof grievanceStepSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type DepartmentInput = z.infer<typeof departmentSchema>;
export type StepTemplateInput = z.infer<typeof stepTemplateSchema>;
export type ContractInput = z.infer<typeof contractSchema>;
export type ContractArticleInput = z.infer<typeof contractArticleSchema>;
export type CustomFieldInput = z.infer<typeof customFieldSchema>;
export type PdfTemplateInput = z.infer<typeof pdfTemplateSchema>;
export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type CampaignTargetCriteriaInput = z.infer<typeof campaignTargetCriteriaSchema>;
export type EmailCampaignInput = z.infer<typeof emailCampaignSchema>;
export type EmailCampaignUpdateInput = z.infer<typeof emailCampaignUpdateSchema>;
export type DisciplinaryInput = z.infer<typeof disciplinarySchema>;
export type DisciplinaryUpdateInput = z.infer<typeof disciplinaryUpdateSchema>;
export type DisciplinaryStepInput = z.infer<typeof disciplinaryStepSchema>;
export type DisciplinaryStepTemplateInput = z.infer<typeof disciplinaryStepTemplateSchema>;
export type DisciplinarySnippetInput = z.infer<typeof disciplinarySnippetSchema>;
