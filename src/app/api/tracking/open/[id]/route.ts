import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 1x1 transparent PNG pixel
const TRACKING_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

// GET /api/tracking/open/[id] - Track email open and return pixel
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: emailId } = await params;
    const userAgent = request.headers.get("user-agent") || undefined;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || undefined;

    // Record the open asynchronously (don't block the response)
    recordOpen(emailId, userAgent, ipAddress).catch(console.error);

    // Return the tracking pixel immediately
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": TRACKING_PIXEL.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Error in tracking pixel:", error);
    // Still return the pixel even on error
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
      },
    });
  }
}

async function recordOpen(emailId: string, userAgent?: string, ipAddress?: string) {
  // Find the email
  const email = await prisma.campaignEmail.findUnique({
    where: { id: emailId },
    select: { id: true, campaignId: true, openCount: true, firstOpenedAt: true },
  });

  if (!email) {
    return;
  }

  const now = new Date();
  const isFirstOpen = email.openCount === 0;

  // Create open record
  await prisma.emailOpen.create({
    data: {
      emailId,
      userAgent,
      ipAddress,
    },
  });

  // Update email stats
  await prisma.campaignEmail.update({
    where: { id: emailId },
    data: {
      openCount: { increment: 1 },
      lastOpenedAt: now,
      ...(isFirstOpen && { firstOpenedAt: now }),
    },
  });

  // Update campaign stats
  await prisma.emailCampaign.update({
    where: { id: email.campaignId },
    data: {
      totalOpens: { increment: 1 },
      ...(isFirstOpen && { uniqueOpens: { increment: 1 } }),
    },
  });
}
