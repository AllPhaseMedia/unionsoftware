import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { memberApiSchema } from "@/lib/validations";
import { ZodError } from "zod";

export async function GET(request: Request) {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const departmentId = searchParams.get("departmentId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    const where = {
      organizationId: dbUser.organizationId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { memberId: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(status && { status: status as "MEMBER" | "NON_MEMBER" | "SEVERED" }),
      ...(departmentId && { departmentId }),
    };

    // Run count and data queries in parallel
    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        select: {
          id: true,
          memberId: true,
          firstName: true,
          lastName: true,
          email: true,
          cellPhone: true,
          homePhone: true,
          jobTitle: true,
          workLocation: true,
          status: true,
          employmentType: true,
          hireDate: true,
          dateOfBirth: true,
          city: true,
          state: true,
          department: { select: { id: true, name: true } },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip,
        take: limit,
      }),
      prisma.member.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
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
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = memberApiSchema.parse(body);

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
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create member" },
      { status: 500 }
    );
  }
}
