import { NextResponse } from "next/server";
import { getAuthUserWithOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    const dbUser = await getAuthUserWithOrg();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify member belongs to the organization
    const member = await prisma.member.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // If documentId provided, return a signed URL for viewing
    if (documentId) {
      const document = await prisma.memberDocument.findUnique({
        where: { id: documentId },
      });

      if (!document || document.memberId !== id) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }

      const adminClient = createAdminClient();
      const { data: signedUrl, error: urlError } = await adminClient.storage
        .from("documents")
        .createSignedUrl(document.storagePath, 3600); // 1 hour expiry

      if (urlError) {
        return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: { url: signedUrl.signedUrl, document } });
    }

    // Otherwise return all documents
    const documents = await prisma.memberDocument.findMany({
      where: { memberId: id },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: documents });
  } catch (error) {
    console.error("Error fetching member documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const dbUser = await getAuthUserWithOrg();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify member belongs to the organization
    const member = await prisma.member.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Upload to Supabase Storage using admin client (bypasses RLS)
    const adminClient = createAdminClient();
    const fileName = `${Date.now()}-${file.name}`;
    const storagePath = `${dbUser.organization.slug}/members/${id}/${fileName}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminClient.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Provide helpful error message
      if (uploadError.message?.includes("Bucket not found")) {
        return NextResponse.json(
          { error: "Storage not configured. Please create a 'documents' bucket in Supabase Storage." },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: uploadError.message || "Failed to upload file" },
        { status: 500 }
      );
    }

    // Create document record
    const document = await prisma.memberDocument.create({
      data: {
        memberId: id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storagePath,
      },
    });

    return NextResponse.json({ success: true, data: document }, { status: 201 });
  } catch (error) {
    console.error("Error uploading member document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 }
      );
    }

    const dbUser = await getAuthUserWithOrg();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify member belongs to the organization
    const member = await prisma.member.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get document
    const document = await prisma.memberDocument.findUnique({
      where: { id: documentId },
    });

    if (!document || document.memberId !== id) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete from storage using admin client (bypasses RLS)
    const adminClient = createAdminClient();
    await adminClient.storage.from("documents").remove([document.storagePath]);

    // Delete record
    await prisma.memberDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting member document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
