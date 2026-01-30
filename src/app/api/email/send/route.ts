import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { format } from "date-fns";

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
      include: { organization: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

    // For now, we'll store the email as a log and return success
    // In production, you would integrate with an email service like:
    // - Resend (resend.com)
    // - SendGrid
    // - AWS SES
    // - Nodemailer with SMTP

    // Create an audit log of the email sent
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
        },
      },
    });

    // TODO: Integrate with actual email service
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'noreply@yourdomain.com',
    //   to,
    //   subject: finalSubject,
    //   text: finalBody,
    // });

    console.log("Email would be sent:", { to, subject: finalSubject, body: finalBody });

    return NextResponse.json({
      success: true,
      message: "Email logged successfully. Configure email service for actual sending.",
      data: {
        to,
        subject: finalSubject,
        preview: finalBody.substring(0, 200),
      },
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
