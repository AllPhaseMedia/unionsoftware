import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { memberSchema } from "@/lib/validations";
import { ZodError } from "zod";

export async function GET(request: Request) {
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

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const departmentId = searchParams.get("departmentId") || undefined;

    const members = await prisma.member.findMany({
      where: {
        organizationId: dbUser.organizationId,
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { memberId: { contains: search, mode: "insensitive" } },
          ],
        }),
        ...(status && { status: status as "MEMBER" | "NON_MEMBER" | "SEVERED" }),
        ...(departmentId && { departmentId }),
      },
      include: { department: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = memberSchema.parse(body);

    const member = await prisma.member.create({
      data: {
        memberId: validatedData.memberId || null,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email || null,
        homePhone: validatedData.homePhone || null,
        cellPhone: validatedData.cellPhone || null,
        address: validatedData.address || null,
        city: validatedData.city || null,
        state: validatedData.state || null,
        zipCode: validatedData.zipCode || null,
        dateOfBirth: validatedData.dateOfBirth || null,
        hireDate: validatedData.hireDate || null,
        jobTitle: validatedData.jobTitle || null,
        workLocation: validatedData.workLocation || null,
        departmentId: validatedData.departmentId || null,
        status: validatedData.status,
        employmentType: validatedData.employmentType || null,
        customFields: validatedData.customFields as object | undefined,
        organizationId: dbUser.organizationId,
      },
      include: { department: true },
    });

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (error) {
    console.error("Error creating member:", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create member" },
      { status: 500 }
    );
  }
}
