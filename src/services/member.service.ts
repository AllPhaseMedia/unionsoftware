import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class MemberService {
  static async findById(id: string, organizationId: string) {
    return prisma.member.findFirst({
      where: { id, organizationId },
      include: {
        department: true,
        grievances: { orderBy: { createdAt: "desc" } },
        notes: {
          include: { user: true },
          orderBy: { createdAt: "desc" },
        },
        documents: { orderBy: { uploadedAt: "desc" } },
      },
    });
  }

  static async findMany(
    organizationId: string,
    filters: {
      status?: string;
      departmentId?: string;
      employmentType?: string;
      search?: string;
    } = {},
    pagination: { page: number; pageSize: number } = { page: 1, pageSize: 20 }
  ) {
    const where: Prisma.MemberWhereInput = {
      organizationId,
      ...(filters.status && { status: filters.status as never }),
      ...(filters.departmentId && { departmentId: filters.departmentId }),
      ...(filters.employmentType && { employmentType: filters.employmentType as never }),
      ...(filters.search && {
        OR: [
          { firstName: { contains: filters.search, mode: "insensitive" } },
          { lastName: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
    };

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        include: { department: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.member.count({ where }),
    ]);

    return {
      data: members,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  static async create(
    data: {
      firstName: string;
      lastName: string;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      zipCode?: string | null;
      hireDate?: Date | null;
      departmentId?: string | null;
      status: "MEMBER" | "NON_MEMBER" | "SEVERED";
      employmentType?: "FULL_TIME" | "PART_TIME" | "TEMPORARY" | "SEASONAL" | null;
      customFields?: Record<string, unknown>;
    },
    organizationId: string
  ) {
    return prisma.member.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        hireDate: data.hireDate,
        departmentId: data.departmentId,
        status: data.status,
        employmentType: data.employmentType,
        customFields: data.customFields as object | undefined,
        organizationId,
      },
      include: { department: true },
    });
  }

  static async update(
    id: string,
    organizationId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      zipCode: string | null;
      hireDate: Date | null;
      departmentId: string | null;
      status: "MEMBER" | "NON_MEMBER" | "SEVERED";
      employmentType: "FULL_TIME" | "PART_TIME" | "TEMPORARY" | "SEASONAL" | null;
      customFields: Record<string, unknown>;
    }>
  ) {
    const existing = await prisma.member.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new Error("Member not found");
    }

    return prisma.member.update({
      where: { id },
      data: data as Prisma.MemberUpdateInput,
      include: { department: true },
    });
  }

  static async delete(id: string, organizationId: string) {
    const existing = await prisma.member.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new Error("Member not found");
    }

    return prisma.member.delete({ where: { id } });
  }

  static async getStats(organizationId: string) {
    const [total, byStatus, byDepartment] = await Promise.all([
      prisma.member.count({ where: { organizationId } }),
      prisma.member.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: true,
      }),
      prisma.member.groupBy({
        by: ["departmentId"],
        where: { organizationId, departmentId: { not: null } },
        _count: true,
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      byDepartment: byDepartment.map((d) => ({
        departmentId: d.departmentId,
        count: d._count,
      })),
    };
  }
}
