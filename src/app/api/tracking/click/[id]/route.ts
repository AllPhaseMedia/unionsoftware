import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/tracking/click/[id]?url=base64encodedurl - Track click and redirect
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: emailId } = await params;
    const { searchParams } = new URL(request.url);
    const encodedUrl = searchParams.get("url");

    if (!encodedUrl) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Decode the original URL
    let originalUrl: string;
    try {
      originalUrl = Buffer.from(encodedUrl, "base64").toString("utf-8");
    } catch {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Validate URL
    try {
      new URL(originalUrl);
    } catch {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const userAgent = request.headers.get("user-agent") || undefined;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || undefined;

    // Record the click asynchronously (don't block the redirect)
    recordClick(emailId, originalUrl, userAgent, ipAddress).catch(console.error);

    // Redirect to the original URL
    return NextResponse.redirect(originalUrl);
  } catch (error) {
    console.error("Error in click tracking:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}

async function recordClick(emailId: string, url: string, userAgent?: string, ipAddress?: string) {
  // Find the email
  const email = await prisma.campaignEmail.findUnique({
    where: { id: emailId },
    select: { id: true, campaignId: true, clickCount: true },
  });

  if (!email) {
    return;
  }

  const isFirstClick = email.clickCount === 0;

  // Create click record
  await prisma.emailClick.create({
    data: {
      emailId,
      url,
      userAgent,
      ipAddress,
    },
  });

  // Update email stats
  await prisma.campaignEmail.update({
    where: { id: emailId },
    data: {
      clickCount: { increment: 1 },
    },
  });

  // Update campaign stats
  await prisma.emailCampaign.update({
    where: { id: email.campaignId },
    data: {
      totalClicks: { increment: 1 },
      ...(isFirstClick && { uniqueClicks: { increment: 1 } }),
    },
  });
}
