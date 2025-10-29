// // pdfClientAddresses.ts
// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";

// export type ClientAddressRow = {
//   id?: number;
//   contractHour?: number | null;
//   client?: {
//     id?: number;
//     name?: string | null;
//     lastName?: string | null;
//     company?: string | null;
//   } | null;
//   address?: string | null;
//   industry?: string | null;
//   city?: string | null;
//   state?: string | null;
//   pincode?: string | null;
//   latitude?: number | string | null;
//   longitute?: number | string | null;
// };

// type PdfOptions = {
//   title?: string;
//   fileName?: string;
//   fonts?: { title?: number; header?: number; body?: number };
//   marginLR?: number;
// };

// const toFullName = (r: ClientAddressRow) =>
//   [r.client?.name ?? "", r.client?.lastName ?? ""].filter(Boolean).join(" ").trim();

// const DEFAULT_TITLE_FONT = 8;
// const DEFAULT_HEADER_FONT = 7;   // a hair smaller
// const DEFAULT_BODY_FONT = 6.5;   // smaller body so more fits
// const DEFAULT_MARGIN_LR = 8;     // slightly smaller margins

// export function downloadClientAddressesPdf(
//   rows: ClientAddressRow[],
//   options?: PdfOptions
// ) {
//   const title = options?.title ?? "Client Addresses";
//   const fileName = options?.fileName ?? "client-addresses.pdf";
//   const TITLE_FONT = options?.fonts?.title ?? DEFAULT_TITLE_FONT;
//   const HEADER_FONT = options?.fonts?.header ?? DEFAULT_HEADER_FONT;
//   const BODY_FONT = options?.fonts?.body ?? DEFAULT_BODY_FONT;
//   const MARGIN_LR = options?.marginLR ?? DEFAULT_MARGIN_LR;

//   const doc = new jsPDF({ unit: "pt", format: "a4" });

//   doc.setFontSize(TITLE_FONT);
//   doc.text(title, MARGIN_LR, 18);

//   const head = [[
//     "Full Name",
//     "Industry",
//     "Contract Hours",
//     "Address",
//     "City",
//     "State",
//     "Zip",
//     "Latitude",
//     "Longitude",
//   ]];

//   const body = rows.map((r) => [
//     toFullName(r),
//     r.industry ?? "",
//     r.contractHour ?? "",
//     r.address ?? "",
//     r.city ?? "",
//     r.state ?? "",
//     r.pincode ?? "",
//     r.latitude ?? "",
//     r.longitute ?? "",
//   ]);

//   autoTable(doc, {
//     head,
//     body,
//     startY: 26,
//     margin: { left: MARGIN_LR, right: MARGIN_LR, top: 14, bottom: 16 },
//     tableWidth: "auto",
//     styles: {
//       fontSize: BODY_FONT,
//       cellPadding: 2,
//       overflow: "linebreak",
//       lineWidth: 0.2,
//     },
//     headStyles: {
//       fontSize: HEADER_FONT,
//       fillColor: [240, 240, 240],
//       textColor: 20,
//       halign: "left",
//     },
//     bodyStyles: {
//       fontSize: BODY_FONT,
//       textColor: 30,
//     },
//     // ⬇️ Key part: make some columns narrower so Lat/Long fit
//     columnStyles: {
//       0: { cellWidth: 90 },     // Full Name (narrower)
//       1: { cellWidth: 80 },     // Industry
//       2: { cellWidth: 60, halign: "center" }, // Contract Hours (narrow, centered)
//       3: { cellWidth: 180 },    // Address (still wraps)
//       4: { cellWidth: 65 },     // City (narrower)
//       5: { cellWidth: 80 },     // State
//       6: { cellWidth: 55, halign: "center" }, // Zip
//       7: { cellWidth: 85 },     // Latitude (ensure visible)
//       8: { cellWidth: 95 },     // Longitude (ensure visible)
//     },
//     rowPageBreak: "auto",
//     didDrawPage: () => {
//       const pageW =
//         typeof doc.internal.pageSize.getWidth === "function"
//           ? doc.internal.pageSize.getWidth()
//           : (doc.internal.pageSize as any).width;

//       const pageH =
//         typeof doc.internal.pageSize.getHeight === "function"
//           ? doc.internal.pageSize.getHeight()
//           : (doc.internal.pageSize as any).height;

//       const pageStr = `Page ${doc.getNumberOfPages()}`;
//       doc.setFontSize(6.5);
//       doc.text(pageStr, pageW - MARGIN_LR - 40, pageH - 10);
//     },
//   });

//   doc.save(fileName);
// }


// pdfClientAddresses.ts (updated)
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ClientAddressRow = {
  id?: number;
  contractHour?: number | null;
  client?: {
    id?: number;
    name?: string | null;
    lastName?: string | null;
    company?: string | null;
  } | null;
  address?: string | null;
  industry?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | string | null;
  longitute?: number | string | null; // (kept your field name)
};

type PdfOptions = {
  title?: string;
  fileName?: string;
  fonts?: { title?: number; header?: number; body?: number };
  marginLR?: number;
};

const toFullName = (r: ClientAddressRow) =>
  [r.client?.name ?? "", r.client?.lastName ?? ""].filter(Boolean).join(" ").trim();

const DEFAULT_TITLE_FONT = 8;
const DEFAULT_HEADER_FONT = 7;
const DEFAULT_BODY_FONT = 6.5;
const DEFAULT_MARGIN_LR = 8;

export function downloadClientAddressesPdf(
  rows: ClientAddressRow[],
  options?: PdfOptions
) {
  const title = options?.title ?? "Clients List";
  const fileName = options?.fileName ?? "client-addresses.pdf";
  const TITLE_FONT = options?.fonts?.title ?? DEFAULT_TITLE_FONT;
  const HEADER_FONT = options?.fonts?.header ?? DEFAULT_HEADER_FONT;
  const BODY_FONT = options?.fonts?.body ?? DEFAULT_BODY_FONT;
  const MARGIN_LR = options?.marginLR ?? DEFAULT_MARGIN_LR;

  // 👉 Landscape gives you more width
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });

  // Title
  doc.setFontSize(TITLE_FONT);
  doc.text(title, MARGIN_LR, 18);

  const head = [[
    "Full Name",
    "Industry",
    "Contract Hours",
    "Address",
    "City",
    "State",
    "Zip",
    "Latitude",
    "Longitude",
  ]];

  const body = rows.map((r) => [
    toFullName(r),
    r.industry ?? "",
    r.contractHour ?? "",
    r.address ?? "",
    r.city ?? "",
    r.state ?? "",
    r.pincode ?? "",
    r.latitude ?? "",
    r.longitute ?? "",
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 26,
    // small, symmetric margins so we use the full width
    margin: { left: MARGIN_LR, right: MARGIN_LR, top: 14, bottom: 14 },
    // let the table size itself within margins (no overflow)
    tableWidth: "auto",
    styles: {
      fontSize: BODY_FONT,
      cellPadding: 2,
      overflow: "linebreak",   // wrap rather than clip
      lineWidth: 0.2,
      // enable word breaking for very long tokens (emails/addresses)
      cellWidth: "wrap",
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
    // Key: narrow some columns so Lat/Long stay visible
    columnStyles: {
      0: { cellWidth: 90 },                 // Full Name (narrow)
      1: { cellWidth: 80 },                 // Industry
      2: { cellWidth: 60, halign: "center" }, // Contract Hours (narrow + centered)
      3: { cellWidth: 220 },                // Address (wraps)
      4: { cellWidth: 70 },                 // City (narrow)
      5: { cellWidth: 85 },                 // State
      6: { cellWidth: 60, halign: "center" }, // Zip
      7: { cellWidth: 95 },                 // Latitude (visible)
      8: { cellWidth: 105 },                // Longitude (visible)
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
      doc.setFontSize(6.5);
      doc.text(pageStr, pageW - MARGIN_LR - 40, pageH - 10);
    },
  });

  doc.save(fileName);
}
