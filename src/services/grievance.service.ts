import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class GrievanceService {
  static async findById(id: string, organizationId: string) {
    return prisma.grievance.findFirst({
      where: { id, organizationId },
      include: {
        member: true,
        representative: true,
        createdBy: true,
        department: true,
        steps: { orderBy: { stepNumber: "asc" } },
        notes: {
          include: { user: true },
          orderBy: { createdAt: "desc" },
        },
        messages: {
          include: {
            user: true,
            replies: { include: { user: true } },
          },
          where: { parentId: null },
          orderBy: { createdAt: "asc" },
        },
        documents: { orderBy: { uploadedAt: "desc" } },
        contractViolations: {
          include: {
            contractArticle: { include: { contract: true } },
          },
        },
      },
    });
  }

  static async findMany(
    organizationId: string,
    filters: {
      status?: string;
      priority?: string;
      departmentId?: string;
      memberId?: string;
      representativeId?: string;
      search?: string;
    } = {},
    pagination: { page: number; pageSize: number } = { page: 1, pageSize: 20 }
  ) {
    const where: Prisma.GrievanceWhereInput = {
      organizationId,
      ...(filters.status && { status: filters.status as never }),
      ...(filters.priority && { priority: filters.priority as never }),
      ...(filters.departmentId && { departmentId: filters.departmentId }),
      ...(filters.memberId && { memberId: filters.memberId }),
      ...(filters.representativeId && { representativeId: filters.representativeId }),
      ...(filters.search && {
        OR: [
          { grievanceNumber: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
    };

    const [grievances, total] = await Promise.all([
      prisma.grievance.findMany({
        where,
        include: {
          member: true,
          representative: true,
          department: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.grievance.count({ where }),
    ]);

    return {
      data: grievances,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  static async create(
    data: {
      memberId?: string | null;
      representativeId?: string | null;
      departmentId?: string | null;
      description: string;
      priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      filingDate: Date;
      customFields?: Record<string, unknown>;
    },
    organizationId: string,
    createdById: string
  ) {
    // Generate grievance number
    const year = new Date().getFullYear();
    const count = await prisma.grievance.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    });
    const grievanceNumber = `GR-${year}-${String(count + 1).padStart(4, "0")}`;

    // Get step templates
    const stepTemplates = await prisma.stepTemplate.findMany({
      where: { organizationId, isActive: true },
      orderBy: { stepNumber: "asc" },
    });

    return prisma.$transaction(async (tx) => {
      const grievance = await tx.grievance.create({
        data: {
          grievanceNumber,
          organizationId,
          createdById,
          memberId: data.memberId || null,
          representativeId: data.representativeId || null,
          departmentId: data.departmentId || null,
          description: data.description,
          priority: data.priority,
          filingDate: data.filingDate,
          customFields: data.customFields as object | undefined,
        },
      });

      if (stepTemplates.length > 0) {
        const filingDate = new Date(data.filingDate);
        await tx.grievanceStep.createMany({
          data: stepTemplates.map((template) => ({
            grievanceId: grievance.id,
            stepNumber: template.stepNumber,
            name: template.name,
            description: template.description,
            deadline: template.defaultDays
              ? new Date(filingDate.getTime() + template.defaultDays * 24 * 60 * 60 * 1000)
              : null,
          })),
        });
      }

      return grievance;
    });
  }

  static async update(
    id: string,
    organizationId: string,
    data: Partial<{
      memberId: string | null;
      representativeId: string | null;
      departmentId: string | null;
      description: string;
      status: string;
      priority: string;
      outcome: string | null;
      outcomeNotes: string | null;
      settlementAmount: number | null;
      filingDate: Date;
      customFields: Record<string, unknown>;
    }>
  ) {
    const existing = await prisma.grievance.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new Error("Grievance not found");
    }

    return prisma.grievance.update({
      where: { id },
      data: data as Prisma.GrievanceUpdateInput,
    });
  }

  static async delete(id: string, organizationId: string) {
    const existing = await prisma.grievance.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new Error("Grievance not found");
    }

    return prisma.grievance.delete({ where: { id } });
  }

  static async getStats(organizationId: string) {
    const [
      total,
      open,
      resolved,
      byStatus,
      byPriority,
    ] = await Promise.all([
      prisma.grievance.count({ where: { organizationId } }),
      prisma.grievance.count({
        where: {
          organizationId,
          status: { in: ["OPEN", "IN_PROGRESS", "PENDING_RESPONSE"] },
        },
      }),
      prisma.grievance.count({
        where: {
          organizationId,
          status: { in: ["RESOLVED", "CLOSED"] },
        },
      }),
      prisma.grievance.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: true,
      }),
      prisma.grievance.groupBy({
        by: ["priority"],
        where: { organizationId },
        _count: true,
      }),
    ]);

    return {
      total,
      open,
      resolved,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count })),
    };
  }
}
