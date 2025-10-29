// pdfClients.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/** One row in your client list (no id/clientId in the PDF) */
export type ClientRow = {
  id?: number;              // omitted in PDF
  clientId?: number;        // omitted in PDF
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;

  client?: {
    id?: number;            // omitted in PDF
    company?: string | null;
    name?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

type PdfOptions = {
  title?: string;          // top-left title (default "Clients")
  fileName?: string;       // saved file name (default "clients.pdf")
  fonts?: { title?: number; header?: number; body?: number };
  marginLR?: number;       // left/right margins (pt)
};

const toFullName = (row: ClientRow) =>
  [row.client?.name ?? "", row.client?.lastName ?? ""].filter(Boolean).join(" ").trim();

// defaults (tiny)
const DEFAULT_TITLE_FONT = 8;
const DEFAULT_HEADER_FONT = 7.5;
const DEFAULT_BODY_FONT = 7;
const DEFAULT_MARGIN_LR = 10;

/**
 * Build and download a PDF for client rows.
 * Columns: Company | Full Name | Email | Phone | Address | City | State | Zip
 * Never shows: id, clientId
 */
export function downloadClientsPdf(rows: ClientRow[], options?: PdfOptions) {
  const title = options?.title ?? "Clients";
  const fileName = options?.fileName ?? "clients.pdf";
  const TITLE_FONT = options?.fonts?.title ?? DEFAULT_TITLE_FONT;
  const HEADER_FONT = options?.fonts?.header ?? DEFAULT_HEADER_FONT;
  const BODY_FONT = options?.fonts?.body ?? DEFAULT_BODY_FONT;
  const MARGIN_LR = options?.marginLR ?? DEFAULT_MARGIN_LR;

  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Title
  doc.setFontSize(TITLE_FONT);
  doc.text(title, MARGIN_LR, 18);

  // Header
  const head = [[
    "Name",
    "Company",
    "Email",
    "Phone",
    "Address",
    "City",
    "State",
    "Zip",
  ]];

  // Rows (omit id/clientId, derive from nested client)
  const body = rows.map((r) => [
    toFullName(r),
    r.client?.company ?? "",
    
    r.client?.email ?? "",
    r.client?.phone ?? "",
    r.address ?? "",
    r.city ?? "",
    r.state ?? "",
    r.pincode ?? "",
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 26,
    margin: { left: MARGIN_LR, right: MARGIN_LR, top: 16, bottom: 18 },
    tableWidth: "auto",
    styles: {
      fontSize: BODY_FONT,
      cellPadding: 2,
      overflow: "linebreak",
      lineWidth: 0.2,
    },
    headStyles: {
      fontSize: HEADER_FONT,
      fillColor: [240, 240, 240],
      textColor: 20,
      halign: "left",
    },
    bodyStyles: {
      fontSize: BODY_FONT,
      textColor: 30,
    },
    // Let long email/address wrap so the table fits margins
    columnStyles: {
      0: { cellWidth: "wrap" }, // Company
      1: { cellWidth: 110 },     // Full Name
      2: { cellWidth: "wrap" }, // Email
      4: { cellWidth: "wrap" }, // Address
    },
    rowPageBreak: "auto",
    didDrawPage: () => {
      const pageW =
        typeof doc.internal.pageSize.getWidth === "function"
          ? doc.internal.pageSize.getWidth()
          : (doc.internal.pageSize as any).width;

      const pageH =
        typeof doc.internal.pageSize.getHeight === "function"
          ? doc.internal.pageSize.getHeight()
          : (doc.internal.pageSize as any).height;

      const pageStr = `Page ${doc.getNumberOfPages()}`;
      doc.setFontSize(7);
      doc.text(pageStr, pageW - MARGIN_LR - 40, pageH - 10);
    },
  });

  doc.save(fileName);
}



