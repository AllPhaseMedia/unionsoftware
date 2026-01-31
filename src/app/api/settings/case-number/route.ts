import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export interface CaseNumberSettings {
  prefix: string;
  includeYear: boolean;
  separator: string;
  nextNumber: number;
  padding: number;
}

const DEFAULT_SETTINGS: CaseNumberSettings = {
  prefix: "GR",
  includeYear: true,
  separator: "-",
  nextNumber: 1,
  padding: 4,
};

export async function GET() {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get case number settings from SystemSetting
    const settings = await prisma.systemSetting.findMany({
      where: {
        organizationId: dbUser.organizationId,
        key: { startsWith: "caseNumber." },
      },
    });

    // Build settings object from stored values
    const caseNumberSettings: CaseNumberSettings = { ...DEFAULT_SETTINGS };

    for (const setting of settings) {
      const key = setting.key.replace("caseNumber.", "");
      if (key === "includeYear") {
        caseNumberSettings.includeYear = setting.value === "true";
      } else if (key === "nextNumber") {
        caseNumberSettings.nextNumber = parseInt(setting.value, 10);
      } else if (key === "padding") {
        caseNumberSettings.padding = parseInt(setting.value, 10);
      } else if (key === "prefix") {
        caseNumberSettings.prefix = setting.value;
      } else if (key === "separator") {
        caseNumberSettings.separator = setting.value;
      }
    }

    return NextResponse.json({ success: true, data: caseNumberSettings });
  } catch (error) {
    console.error("Error fetching case number settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch case number settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { prefix, includeYear, separator, nextNumber, padding } = body as CaseNumberSettings;

    // Validate inputs
    if (!prefix || prefix.length > 10) {
      return NextResponse.json({ error: "Prefix is required and must be 10 characters or less" }, { status: 400 });
    }
    if (typeof includeYear !== "boolean") {
      return NextResponse.json({ error: "Include year must be a boolean" }, { status: 400 });
    }
    if (!separator || separator.length > 3) {
      return NextResponse.json({ error: "Separator must be 1-3 characters" }, { status: 400 });
    }
    if (!nextNumber || nextNumber < 1) {
      return NextResponse.json({ error: "Next number must be at least 1" }, { status: 400 });
    }
    if (!padding || padding < 1 || padding > 10) {
      return NextResponse.json({ error: "Padding must be between 1 and 10" }, { status: 400 });
    }

    // Upsert each setting
    const settingsToSave = [
      { key: "caseNumber.prefix", value: prefix },
      { key: "caseNumber.includeYear", value: String(includeYear) },
      { key: "caseNumber.separator", value: separator },
      { key: "caseNumber.nextNumber", value: String(nextNumber) },
      { key: "caseNumber.padding", value: String(padding) },
    ];

    for (const setting of settingsToSave) {
      await prisma.systemSetting.upsert({
        where: {
          key_organizationId: {
            key: setting.key,
            organizationId: dbUser.organizationId,
          },
        },
        update: { value: setting.value },
        create: {
          key: setting.key,
          value: setting.value,
          organizationId: dbUser.organizationId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving case number settings:", error);
    return NextResponse.json(
      { error: "Failed to save case number settings" },
      { status: 500 }
    );
  }
}
