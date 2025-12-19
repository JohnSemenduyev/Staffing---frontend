import * as ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generic data export utilities for PDF and Excel
 * Works for both Manager and Admin portals
 */

// ==================== TYPES ====================

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  formatter?: (value: any, row: any) => string | number;
}

export interface ExportOptions {
  title?: string;
  fileName?: string;
  includeTimestamp?: boolean;
  portal?: "admin" | "manager";
}

export interface PdfExportOptions extends ExportOptions {
  fonts?: {
    title?: number;
    header?: number;
    body?: number;
  };
  marginLR?: number;
}

export interface ExcelExportOptions extends ExportOptions {
  worksheetName?: string;
  includeHeaderStyle?: boolean;
}

// ==================== PDF EXPORT ====================

/**
 * Generic PDF export function
 * @param data - Array of data objects to export
 * @param columns - Column definitions with key, header, and optional formatter
 * @param options - PDF export options
 */
export function exportToPDF(
  data: any[],
  columns: ExportColumn[],
  options: PdfExportOptions = {}
): void {
  if (!data || data.length === 0) {
    console.warn("No data to export to PDF");
    return;
  }

  const title = options.title || "Data Export";
  const fileName = options.fileName || "export.pdf";
  const TITLE_FONT = options.fonts?.title ?? 8;
  const HEADER_FONT = options.fonts?.header ?? 7.5;
  const BODY_FONT = options.fonts?.body ?? 7;
  const MARGIN_LR = options.marginLR ?? 10;

  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Title
  doc.setFontSize(TITLE_FONT);
  doc.text(title, MARGIN_LR, 18);

  // Build header row
  const head = [columns.map((col) => col.header)];

  // Build body rows
  const body = data.map((row) =>
    columns.map((col) => {
      const value = getNestedValue(row, col.key);
      return col.formatter ? col.formatter(value, row) : formatValue(value);
    })
  );

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
    columnStyles: columns.reduce((acc, col, index) => {
      if (col.width) {
        acc[index] = { cellWidth: col.width };
      }
      return acc;
    }, {} as Record<number, any>),
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

// ==================== EXCEL EXPORT ====================

/**
 * Generic Excel export function
 * @param data - Array of data objects to export
 * @param columns - Column definitions with key, header, and optional formatter
 * @param options - Excel export options
 */
export async function exportToExcel(
  data: any[],
  columns: ExportColumn[],
  options: ExcelExportOptions = {}
): Promise<{ success: boolean; filename?: string; error?: string }> {
  try {
    if (!data || data.length === 0) {
      return { success: false, error: "No data to export" };
    }

    const workbook = new ExcelJS.Workbook();
    const worksheetName = options.worksheetName || "Data";
    const worksheet = workbook.addWorksheet(worksheetName);

    // Define columns
    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 15,
    }));

    // Add data rows
    const rows = data.map((row) => {
      const rowData: any = {};
      columns.forEach((col) => {
        const value = getNestedValue(row, col.key);
        rowData[col.key] = col.formatter
          ? col.formatter(value, row)
          : formatValue(value);
      });
      return rowData;
    });

    worksheet.addRows(rows);

    // Style header row
    if (options.includeHeaderStyle !== false) {
      const headerRow = worksheet.getRow(1);
      headerRow.font = {
        bold: true,
        size: 11,
        name: "Aptos Narrow",
        color: { argb: "FF000000" },
      };
      headerRow.height = 20;
      headerRow.alignment = { vertical: "middle" };
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE6EEF5" },
        };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFB7B7B7" } },
        };
      });
    }

    // Style data rows
    const lastRowNum = worksheet.lastRow?.number ?? 1;
    for (let r = 2; r <= lastRowNum; r++) {
      const row = worksheet.getRow(r);
      row.font = {
        size: 11,
        name: "Aptos Narrow",
        color: { argb: "FF000000" },
      };
      row.alignment = { vertical: "middle" };
      row.eachCell((c) => {
        c.border = { bottom: { style: "thin", color: { argb: "FFF2F2F2" } } };
      });
    }

    // Auto-fit columns
    worksheet.columns.forEach((col) => {
      if (col.values) {
        const values = col.values.slice(1) as ExcelJS.CellValue[];
        const headerLen = col.header ? String(col.header).length : 0;
        let maxContentLen = 0;

        for (const v of values) {
          const len = cellValueToTextLen(v);
          if (len > maxContentLen) {
            maxContentLen = len;
          }
        }

        const maxLen = Math.max(headerLen, maxContentLen);
        col.width = Math.min(Math.max(12, maxLen + 2), 50);
      }
    });

    // Freeze header
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    // Generate filename
    const timestamp = options.includeTimestamp
      ? new Date().toISOString().split("T")[0]
      : "";
    const baseFileName = options.fileName || "export";
    const finalFilename = timestamp
      ? `${baseFileName}_${timestamp}.xlsx`
      : `${baseFileName}.xlsx`;

    // Save file
    const buffer = await workbook.xlsx.writeBuffer();

    if (typeof window !== "undefined") {
      const blob = new Blob([buffer], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to export Excel file",
    };
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

/**
 * Format value for display
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

/**
 * Convert ExcelJS CellValue to text length for auto-sizing
 */
function cellValueToTextLen(v: ExcelJS.CellValue): number {
  if (v == null) return 0;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return String(v).length;
  if (v instanceof Date) return v.toISOString().length;

  const anyV = v as any;

  if (anyV?.richText && Array.isArray(anyV.richText)) {
    return anyV.richText.map((rt: any) => rt?.text ?? "").join("").length;
  }

  if ("hyperlink" in anyV) {
    return String(anyV.text ?? anyV.hyperlink ?? "").length;
  }

  if ("formula" in anyV) {
    return cellValueToTextLen(anyV.result ?? "");
  }

  try {
    return JSON.stringify(v).length;
  } catch {
    return String(v).length;
  }
}

// ==================== PRESET COLUMN DEFINITIONS ====================

/**
 * Common column definitions for user lists (Guards, Managers, Admins)
 */
export const userListColumns: ExportColumn[] = [
  {
    key: "fullName",
    header: "Full Name",
    formatter: (_, row) =>
      [row.name, row.lastName].filter(Boolean).join(" ").trim() || "",
  },
  { key: "email", header: "Email" },
  { key: "phone", header: "Phone" },
  { key: "address", header: "Street Address" },
  { key: "city", header: "City" },
  { key: "state", header: "State" },
  { key: "zipcode", header: "Zipcode" },
];

/**
 * User list columns with approval status
 */
export const userListColumnsWithStatus: ExportColumn[] = [
  ...userListColumns,
  {
    key: "status",
    header: "Approval Status",
    formatter: (value) => (value ? "Approved" : "Pending"),
  },
];

/**
 * Client list columns
 */
export const clientListColumns: ExportColumn[] = [
  {
    key: "fullName",
    header: "Name",
    formatter: (_, row) =>
      [row.client?.name, row.client?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || "",
  },
  { key: "company", header: "Company", formatter: (_, row) => row.client?.company || "" },
  { key: "email", header: "Email", formatter: (_, row) => row.client?.email || "" },
  { key: "phone", header: "Phone", formatter: (_, row) => row.client?.phone || "" },
  { key: "address", header: "Address" },
  { key: "city", header: "City" },
  { key: "state", header: "State" },
  { key: "pincode", header: "Zip Code" },
];

