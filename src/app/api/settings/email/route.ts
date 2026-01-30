import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// Email settings keys
const EMAIL_SETTINGS_KEYS = [
  "smtp_host",
  "smtp_port",
  "smtp_secure",
  "smtp_user",
  "smtp_password",
  "smtp_from_email",
  "smtp_from_name",
  "smtp_enabled",
];

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    });

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const settings = await prisma.systemSetting.findMany({
      where: {
        organizationId: dbUser.organizationId,
        key: { in: EMAIL_SETTINGS_KEYS },
      },
    });

    // Convert to key-value object (mask password)
    const settingsObj: Record<string, string> = {};
    for (const setting of settings) {
      if (setting.key === "smtp_password" && setting.value) {
        // Mask password - show only that it's set
        settingsObj[setting.key] = "••••••••";
      } else {
        settingsObj[setting.key] = setting.value;
      }
    }

    return NextResponse.json({ success: true, data: settingsObj });
  } catch (error) {
    console.error("Error fetching email settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch email settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    });

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();

    // Upsert each setting
    for (const key of EMAIL_SETTINGS_KEYS) {
      if (body[key] !== undefined) {
        // Skip password if it's the masked value
        if (key === "smtp_password" && body[key] === "••••••••") {
          continue;
        }

        await prisma.systemSetting.upsert({
          where: {
            key_organizationId: {
              key,
              organizationId: dbUser.organizationId,
            },
          },
          update: { value: body[key] || "" },
          create: {
            key,
            value: body[key] || "",
            organizationId: dbUser.organizationId,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating email settings:", error);
    return NextResponse.json(
      { error: "Failed to update email settings" },
      { status: 500 }
    );
  }
}
