import prisma from "@/lib/prisma";
import type { AuditAction } from "@prisma/client";

export class AuditService {
  static async log(
    entityType: string,
    entityId: string,
    action: AuditAction,
    userId: string,
    changes: Record<string, unknown>
  ) {
    return prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        userId,
        changes: changes as object,
      },
    });
  }

  static async getByEntity(entityType: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: { entityType, entityId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getByUser(userId: string, limit = 50) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  static async getRecent(organizationId: string, limit = 100) {
    return prisma.auditLog.findMany({
      where: {
        user: { organizationId },
      },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  static diffObjects(
    original: Record<string, unknown>,
    updated: Record<string, unknown>
  ): Record<string, { old: unknown; new: unknown }> {
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    const allKeys = new Set([
      ...Object.keys(original),
      ...Object.keys(updated),
    ]);

    for (const key of allKeys) {
      const oldValue = original[key];
      const newValue = updated[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = { old: oldValue, new: newValue };
      }
    }

    return changes;
  }
}
