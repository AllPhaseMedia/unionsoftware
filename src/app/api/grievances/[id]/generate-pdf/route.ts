import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { format } from "date-fns";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Template variable replacements
function replaceTemplateVariables(template: string, data: Record<string, unknown>): string {
  let result = template;

  // Replace simple variables like {{grievance.number}}
  result = result.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split(".");
    let value: unknown = data;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return match; // Keep original if path not found
      }
    }

    // Format dates
    if (value instanceof Date) {
      return format(value, "MMMM d, yyyy");
    }

    return String(value ?? "");
  });

  // Handle {{#each steps}}...{{/each}} blocks
  result = result.replace(
    /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (match, arrayName, innerTemplate) => {
      const array = data[arrayName];
      if (!Array.isArray(array)) return "";

      return array
        .map((item, index) => {
          let itemResult = innerTemplate;
          // Replace {{this.property}} with item values
          itemResult = itemResult.replace(/\{\{this\.([^}]+)\}\}/g, (_m: string, prop: string) => {
            const value = item[prop as keyof typeof item];
            if (value instanceof Date) {
              return format(value, "MMMM d, yyyy");
            }
            return String(value ?? "");
          });
          // Replace {{@index}} with index
          itemResult = itemResult.replace(/\{\{@index\}\}/g, String(index + 1));
          return itemResult;
        })
        .join("");
    }
  );

  return result;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
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
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 });
    }

    // Get the grievance with all relations
    const grievance = await prisma.grievance.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
      include: {
        member: {
          include: {
            department: true,
          },
        },
        representative: true,
        createdBy: true,
        department: true,
        steps: {
          orderBy: { stepNumber: "asc" },
        },
        contractViolations: {
          include: {
            contractArticle: {
              include: {
                contract: true,
              },
            },
          },
        },
      },
    });

    if (!grievance) {
      return NextResponse.json({ error: "Grievance not found" }, { status: 404 });
    }

    // Get the template
    const template = await prisma.pdfTemplate.findFirst({
      where: {
        id: templateId,
        organizationId: dbUser.organizationId,
        isActive: true,
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Prepare data for template
    const templateData = {
      grievance: {
        number: grievance.grievanceNumber,
        filing_date: grievance.filingDate,
        description: grievance.description,
        relief_requested: grievance.reliefRequested || "",
        status: grievance.status,
        priority: grievance.priority,
        outcome: grievance.outcome || "",
        outcome_notes: grievance.outcomeNotes || "",
        settlement_amount: grievance.settlementAmount?.toString() || "",
        job_title: grievance.memberJobTitle || "",
        commissioner: grievance.commissionerName || "",
      },
      member: grievance.member
        ? {
            name: `${grievance.member.firstName} ${grievance.member.lastName}`,
            first_name: grievance.member.firstName,
            last_name: grievance.member.lastName,
            email: grievance.member.email || "",
            job_title: grievance.member.jobTitle || "",
            department: grievance.member.department?.name || "",
          }
        : {
            name: "",
            first_name: "",
            last_name: "",
            email: "",
            job_title: "",
            department: "",
          },
      representative: grievance.representative
        ? {
            name: grievance.representative.name,
            email: grievance.representative.email,
          }
        : {
            name: "",
            email: "",
          },
      department: grievance.department
        ? {
            name: grievance.department.name,
            commissioner: grievance.department.commissionerName || "",
          }
        : {
            name: "",
            commissioner: "",
          },
      organization: {
        name: dbUser.organization.name,
      },
      steps: grievance.steps.map((step) => ({
        number: step.stepNumber,
        name: step.name,
        status: step.status,
        deadline: step.deadline,
        completed_at: step.completedAt,
        notes: step.notes || "",
      })),
      violations: grievance.contractViolations.map((v) => ({
        article_number: v.contractArticle.articleNumber,
        article_title: v.contractArticle.title,
        article_content: v.contractArticle.content,
        contract_name: v.contractArticle.contract.name,
        notes: v.notes || "",
      })),
      current_date: new Date(),
    };

    // Replace template variables
    const filledHtml = replaceTemplateVariables(template.content, templateData);

    // Create a simple HTML document for PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #333;
      padding: 20px;
    }
    h1 { font-size: 18px; margin-bottom: 10px; }
    h2 { font-size: 14px; margin-top: 20px; margin-bottom: 10px; }
    h3 { font-size: 12px; margin-top: 15px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .section { margin-bottom: 15px; }
    .label { font-weight: bold; }
    .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; color: #666; }
  </style>
</head>
<body>
  ${filledHtml}
</body>
</html>
`;

    // For server-side PDF generation, we'll use a simpler approach
    // Store the HTML as a document and return it for client-side PDF generation
    // Or use a PDF service like Puppeteer in a separate service

    // For now, let's create a simple text-based PDF using the html content
    // We'll upload the HTML and let the client convert it

    const adminClient = createAdminClient();

    // Build filename: "Grievance # - Member Name - Department.pdf"
    const memberName = grievance.member
      ? `${grievance.member.firstName} ${grievance.member.lastName}`
      : "No Member";
    const departmentName = grievance.department?.name || "No Department";
    // Sanitize filename (remove invalid characters)
    const sanitize = (str: string) => str.replace(/[<>:"/\\|?*]/g, "").trim();
    const fileName = `${sanitize(grievance.grievanceNumber)} - ${sanitize(memberName)} - ${sanitize(departmentName)}.html`;
    const storagePath = `${dbUser.organization.slug}/grievances/${id}/${fileName}`;

    const { error: uploadError } = await adminClient.storage
      .from("documents")
      .upload(storagePath, Buffer.from(htmlContent, "utf-8"), {
        contentType: "text/html",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        grievanceId: id,
        fileName: fileName.replace(".html", ".pdf"),
        fileType: "application/pdf",
        fileSize: htmlContent.length,
        storagePath,
      },
    });

    // Get signed URL for the HTML file
    const { data: signedUrl } = await adminClient.storage
      .from("documents")
      .createSignedUrl(storagePath, 3600);

    return NextResponse.json({
      success: true,
      data: {
        document,
        htmlContent,
        downloadUrl: signedUrl?.signedUrl,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
