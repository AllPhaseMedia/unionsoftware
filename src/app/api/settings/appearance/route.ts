import { NextResponse } from "next/server";
import { getAuthUserWithOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const dbUser = await getAuthUserWithOrg();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all appearance-related settings
    const settings = await prisma.systemSetting.findMany({
      where: {
        organizationId: dbUser.organizationId,
        key: {
          in: [
            "logo_url",
            "logo_height",
            "organization_name",
            "menu_bg_color",
            "menu_text_color",
            "menu_accent_color",
            "custom_css",
            "custom_head_html",
          ],
        },
      },
    });

    // Convert to key-value object
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({ success: true, data: settingsMap });
  } catch (error) {
    console.error("Error fetching appearance settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const dbUser = await getAuthUserWithOrg();

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") || "";

    // Handle file upload for logo
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("logo") as File;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Upload to Supabase Storage
      const adminClient = createAdminClient();
      const fileName = `logo-${Date.now()}.${file.name.split(".").pop()}`;
      const storagePath = `${dbUser.organization.slug}/branding/${fileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await adminClient.storage
        .from("documents")
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload logo" },
          { status: 500 }
        );
      }

      // Get signed URL (works for private buckets) - 1 year expiry
      const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
        .from("documents")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error("Signed URL error:", signedUrlError);
        // Fallback to public URL
        const { data: urlData } = adminClient.storage
          .from("documents")
          .getPublicUrl(storagePath);

        await prisma.systemSetting.upsert({
          where: {
            key_organizationId: {
              key: "logo_url",
              organizationId: dbUser.organizationId,
            },
          },
          update: { value: urlData.publicUrl },
          create: {
            key: "logo_url",
            value: urlData.publicUrl,
            organizationId: dbUser.organizationId,
          },
        });

        return NextResponse.json({
          success: true,
          data: { logo_url: urlData.publicUrl },
        });
      }

      // Save signed URL to settings
      await prisma.systemSetting.upsert({
        where: {
          key_organizationId: {
            key: "logo_url",
            organizationId: dbUser.organizationId,
          },
        },
        update: { value: signedUrlData.signedUrl },
        create: {
          key: "logo_url",
          value: signedUrlData.signedUrl,
          organizationId: dbUser.organizationId,
        },
      });

      return NextResponse.json({
        success: true,
        data: { logo_url: signedUrlData.signedUrl },
      });
    }

    // Handle JSON settings update
    const body = await request.json();
    const allowedKeys = [
      "logo_height",
      "organization_name",
      "menu_bg_color",
      "menu_text_color",
      "menu_accent_color",
      "custom_css",
      "custom_head_html",
    ];

    const updates: Promise<unknown>[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (allowedKeys.includes(key) && typeof value === "string") {
        updates.push(
          prisma.systemSetting.upsert({
            where: {
              key_organizationId: {
                key,
                organizationId: dbUser.organizationId,
              },
            },
            update: { value },
            create: {
              key,
              value,
              organizationId: dbUser.organizationId,
            },
          })
        );
      }
    }

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating appearance settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const dbUser = await getAuthUserWithOrg();

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete logo setting
    await prisma.systemSetting.deleteMany({
      where: {
        organizationId: dbUser.organizationId,
        key: "logo_url",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting logo:", error);
    return NextResponse.json(
      { error: "Failed to delete logo" },
      { status: 500 }
    );
  }
}
