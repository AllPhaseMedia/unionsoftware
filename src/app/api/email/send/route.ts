import { NextResponse } from "next/server";
import { getAuthUserWithOrg } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import nodemailer from "nodemailer";

// Template variable replacements
function replaceTemplateVariables(template: string, data: Record<string, unknown>): string {
  let result = template;

  result = result.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split(".");
    let value: unknown = data;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return match;
      }
    }

    if (value instanceof Date) {
      return format(value, "MMMM d, yyyy");
    }

    return String(value ?? "");
  });

  return result;
}

// Get SMTP settings for organization
async function getSmtpSettings(organizationId: string) {
  const settings = await prisma.systemSetting.findMany({
    where: {
      organizationId,
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

  return settingsMap;
}

// Create nodemailer transporter
function createTransporter(settings: Record<string, string>) {
  const port = parseInt(settings.smtp_port || "587", 10);
  const secure = settings.smtp_secure === "ssl";

  const config: nodemailer.TransportOptions = {
    host: settings.smtp_host,
    port,
    secure,
    auth:
      settings.smtp_user && settings.smtp_password
        ? {
            user: settings.smtp_user,
            pass: settings.smtp_password,
          }
        : undefined,
  } as nodemailer.TransportOptions;

  // Add TLS options for non-SSL connections
  if (!secure && settings.smtp_secure === "tls") {
    (config as Record<string, unknown>).requireTLS = true;
  }

  return nodemailer.createTransport(config);
}

export async function POST(request: Request) {
  try {
    const dbUser = await getAuthUserWithOrg();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { to, subject, body: emailBody, templateId, memberId, grievanceId } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body" },
        { status: 400 }
      );
    }

    // Build template data if member or grievance provided
    let templateData: Record<string, unknown> = {
      organization: {
        name: dbUser.organization.name,
      },
      sender: {
        name: dbUser.name,
        email: dbUser.email,
      },
      current_date: new Date(),
    };

    if (memberId) {
      const member = await prisma.member.findFirst({
        where: {
          id: memberId,
          organizationId: dbUser.organizationId,
        },
        include: { department: true },
      });

      if (member) {
        templateData.member = {
          name: `${member.firstName} ${member.lastName}`,
          first_name: member.firstName,
          last_name: member.lastName,
          email: member.email || "",
          job_title: member.jobTitle || "",
          department: member.department?.name || "",
        };
      }
    }

    if (grievanceId) {
      const grievance = await prisma.grievance.findFirst({
        where: {
          id: grievanceId,
          organizationId: dbUser.organizationId,
        },
        include: {
          member: { include: { department: true } },
          representative: true,
          department: true,
        },
      });

      if (grievance) {
        templateData.grievance = {
          number: grievance.grievanceNumber,
          filing_date: grievance.filingDate,
          description: grievance.description,
          relief_requested: grievance.reliefRequested || "",
          status: grievance.status,
          priority: grievance.priority,
          job_title: grievance.memberJobTitle || "",
          commissioner: grievance.commissionerName || "",
        };

        if (grievance.member && !memberId) {
          templateData.member = {
            name: `${grievance.member.firstName} ${grievance.member.lastName}`,
            first_name: grievance.member.firstName,
            last_name: grievance.member.lastName,
            email: grievance.member.email || "",
            job_title: grievance.member.jobTitle || "",
            department: grievance.member.department?.name || "",
          };
        }

        if (grievance.department) {
          templateData.department = {
            name: grievance.department.name,
            commissioner: grievance.department.commissionerName || "",
          };
        }
      }
    }

    // Replace template variables
    const finalSubject = replaceTemplateVariables(subject, templateData);
    const finalBody = replaceTemplateVariables(emailBody, templateData);

    // Get SMTP settings
    const smtpSettings = await getSmtpSettings(dbUser.organizationId);
    const emailEnabled = smtpSettings.smtp_enabled === "true";

    let emailSent = false;
    let errorMessage = "";

    // Try to send email if SMTP is configured and enabled
    if (emailEnabled && smtpSettings.smtp_host) {
      try {
        const transporter = createTransporter(smtpSettings);

        const fromName = smtpSettings.smtp_from_name || dbUser.organization.name;
        const fromEmail = smtpSettings.smtp_from_email || smtpSettings.smtp_user;

        // Convert plain text body to simple HTML
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${finalBody.split("\n").map((line) => (line.trim() ? `<p>${line}</p>` : "<br>")).join("")}
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              Sent by ${dbUser.name} via ${dbUser.organization.name}
            </p>
          </div>
        `;

        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to,
          subject: finalSubject,
          text: finalBody,
          html: htmlBody,
        });

        emailSent = true;
      } catch (err) {
        console.error("Error sending email via SMTP:", err);
        errorMessage = err instanceof Error ? err.message : "Unknown error";
      }
    }

    // Create an audit log of the email
    await prisma.auditLog.create({
      data: {
        entityType: grievanceId ? "grievance" : memberId ? "member" : "email",
        entityId: grievanceId || memberId || "general",
        action: "CREATE",
        userId: dbUser.id,
        changes: {
          type: "email_sent",
          to,
          subject: finalSubject,
          body: finalBody,
          templateId: templateId || null,
          sentAt: new Date().toISOString(),
          delivered: emailSent,
          error: errorMessage || undefined,
        },
      },
    });

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: "Email sent successfully",
        data: {
          to,
          subject: finalSubject,
          preview: finalBody.substring(0, 200),
        },
      });
    } else if (!emailEnabled) {
      return NextResponse.json({
        success: true,
        message: "Email logged. Enable SMTP in Settings > Email Settings to send emails.",
        data: {
          to,
          subject: finalSubject,
          preview: finalBody.substring(0, 200),
          warning: "Email not sent - SMTP not enabled",
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to send email: ${errorMessage}`,
          data: {
            to,
            subject: finalSubject,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
