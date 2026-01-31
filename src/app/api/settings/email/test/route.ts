import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 });
    }

    // Get SMTP settings
    const settings = await prisma.systemSetting.findMany({
      where: {
        organizationId: dbUser.organizationId,
        key: {
          in: [
            "smtp_host",
            "smtp_port",
            "smtp_secure",
            "smtp_user",
            "smtp_password",
            "smtp_from_email",
            "smtp_from_name",
            "smtp_enabled",
          ],
        },
      },
    });

    const settingsMap: Record<string, string> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    // Check if email is enabled
    if (settingsMap.smtp_enabled !== "true") {
      return NextResponse.json(
        { error: "Email sending is not enabled" },
        { status: 400 }
      );
    }

    // Check required settings
    if (!settingsMap.smtp_host || !settingsMap.smtp_port) {
      return NextResponse.json(
        { error: "SMTP host and port are required" },
        { status: 400 }
      );
    }

    // Configure nodemailer transport
    const port = parseInt(settingsMap.smtp_port, 10);
    const secure = settingsMap.smtp_secure === "ssl";

    const transportConfig: nodemailer.TransportOptions = {
      host: settingsMap.smtp_host,
      port,
      secure,
      auth:
        settingsMap.smtp_user && settingsMap.smtp_password
          ? {
              user: settingsMap.smtp_user,
              pass: settingsMap.smtp_password,
            }
          : undefined,
    } as nodemailer.TransportOptions;

    // Add TLS options for non-SSL connections
    if (!secure && settingsMap.smtp_secure === "tls") {
      (transportConfig as Record<string, unknown>).requireTLS = true;
    }

    const transporter = nodemailer.createTransport(transportConfig);

    // Get organization name for the test email
    const organization = await prisma.organization.findUnique({
      where: { id: dbUser.organizationId },
    });

    const fromName = settingsMap.smtp_from_name || organization?.name || "UnionSoftware";
    const fromEmail = settingsMap.smtp_from_email || settingsMap.smtp_user;

    // Send test email
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: "Test Email from UnionSoftware",
      text: `This is a test email from UnionSoftware.\n\nIf you received this email, your SMTP settings are configured correctly.\n\nSent at: ${new Date().toLocaleString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email from UnionSoftware</h2>
          <p>This is a test email from UnionSoftware.</p>
          <p style="color: #22c55e; font-weight: bold;">If you received this email, your SMTP settings are configured correctly!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending test email:", error);

    // Provide more helpful error messages
    let errorMessage = "Failed to send test email";
    if (error instanceof Error) {
      if (error.message.includes("ECONNREFUSED")) {
        errorMessage = "Connection refused. Check your SMTP host and port.";
      } else if (error.message.includes("ENOTFOUND")) {
        errorMessage = "SMTP host not found. Check your host setting.";
      } else if (error.message.includes("auth")) {
        errorMessage = "Authentication failed. Check your username and password.";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Connection timed out. Check your firewall settings.";
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
