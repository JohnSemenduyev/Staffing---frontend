// pdfGuards.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type Guard = {
  name: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  role?: string | null;
};

type ApiResponse = {
  data?: {
    guardUsers?: {
      data?: Guard[];
      lastPage?: number;
    };
  };
};

type PdfOptions = {
  /** Title shown at the top of the PDF (default: "List") */
  title?: string;
  /** File name for the saved PDF (default: "list.pdf") */
  fileName?: string;
  /** Adjust fonts/margins if you ever need to override the tiny defaults */
  fonts?: { title?: number; header?: number; body?: number };
  marginLR?: number; // left/right margin
};

const toFullName = (g: Guard) =>
  [g.name ?? "", g.lastName ?? ""].filter(Boolean).join(" ").trim();

// 🎛️ defaults (can be overridden via options.fonts / options.marginLR)
const DEFAULT_TITLE_FONT = 8;
const DEFAULT_HEADER_FONT = 7.5;
const DEFAULT_BODY_FONT = 7;
const DEFAULT_MARGIN_LR = 10;

/**
 * Reusable PDF exporter for name/email/phone/address/city/state/zip lists.
 * - Combine name + lastName into "Full Name"
 * - Excludes id
 * - Custom title and saved filename via options
 */
export function downloadListPdf(
  input: ApiResponse | Guard[],
  options?: PdfOptions
) {
  const guards: Guard[] = Array.isArray(input)
    ? input
    : input?.data?.guardUsers?.data ?? [];

  const title = options?.title ?? "List";
  const fileName = options?.fileName ?? "list.pdf";
  const TITLE_FONT = options?.fonts?.title ?? DEFAULT_TITLE_FONT;
  const HEADER_FONT = options?.fonts?.header ?? DEFAULT_HEADER_FONT;
  const BODY_FONT = options?.fonts?.body ?? DEFAULT_BODY_FONT;
  const MARGIN_LR = options?.marginLR ?? DEFAULT_MARGIN_LR;

  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Title
  doc.setFontSize(TITLE_FONT);
  doc.text(title, MARGIN_LR, 18);

  const head = [[
    "Full Name",
    "Email",
    "Phone",
    "Address",
    "City",
    "State",
    "Zip",
  ]];

  const body = guards.map((g) => [
    toFullName(g),
    g.email ?? "",
    g.phone ?? "",
    g.address ?? "",
    g.city ?? "",
    g.state ?? "",
    g.zipcode ?? "",
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
    columnStyles: {
      1: { cellWidth: "wrap" }, // Email wraps
      3: { cellWidth: "wrap" }, // Address wraps
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
