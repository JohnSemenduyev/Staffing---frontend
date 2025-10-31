import * as ExcelJS from "exceljs";

type AdminData = {
  id?: number | string | null;
  name?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  status?: boolean | null;
};

type ApiResponse = {
  data?: {
    adminUsers?: {
      data?: AdminData[];
      lastPage?: number;
    };
  };
};

// ---- helper: map any ExcelJS CellValue to a display string length ----
function cellValueToTextLen(v: ExcelJS.CellValue): number {
  if (v == null) return 0; // null/undefined
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return String(v).length;
  if (v instanceof Date) return v.toISOString().length;

  // Object unions
  const anyV = v as any;

  // Rich text: { richText: [{ text: string }...] }
  if (anyV?.richText && Array.isArray(anyV.richText)) {
    return anyV.richText.map((rt: any) => rt?.text ?? "").join("").length;
  }

  // Hyperlink: { text?: string, hyperlink: string }
  if ("hyperlink" in anyV) {
    return String(anyV.text ?? anyV.hyperlink ?? "").length;
  }

  // Formula: { formula: string, result?: CellValue }
  if ("formula" in anyV) {
    return cellValueToTextLen(anyV.result ?? "");
  }

  // Fallback
  try {
    return JSON.stringify(v).length;
  } catch {
    return String(v).length;
  }
}

export const exportUserListToExcel = async (
  input: ApiResponse | AdminData[] | any,
  filename: string = "users",
  includeApprovalStatus: boolean = true
) => {
  try {
    // Normalize input -> admins[]
    let admins: AdminData[] = [];
    if (Array.isArray(input)) admins = input;
    else if (input?.data?.adminUsers?.data) admins = input.data.adminUsers.data;
    else if (input?.data && Array.isArray(input.data)) admins = input.data;
    else if (input && typeof input === "object") {
      admins =
        (Object.values(input).find((v) => Array.isArray(v)) as AdminData[]) ||
        [];
    }

    if (!admins?.length) {
      return { success: false, error: "No admin data found to export" };
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Admins");

    // Define columns (keys must match row objects)
    const baseColumns = [
      { header: "Full Name", key: "fullName" },
      { header: "Email", key: "email" },
      { header: "Phone", key: "phone" },
      { header: "Street Address", key: "address" },
      { header: "City", key: "city" },
      { header: "State", key: "state" },
      { header: "Zipcode", key: "zipcode" },
    ];

    if (includeApprovalStatus) {
      baseColumns.push({ header: "Approval Status", key: "status" });
    }

    worksheet.columns = baseColumns;

    // Add data rows
    worksheet.addRows(
      admins.map((a) => {
        const fullName = [a.name, a.lastName].filter(Boolean).join(" ").trim();
        const rowData: any = {
          fullName: fullName || "",
          email: a.email ?? "",
          phone: a.phone ?? "",
          address: a.address ?? "",
          city: a.city ?? "",
          state: a.state ?? "",
          zipcode: a.zipcode ?? "",
        };

        if (includeApprovalStatus) {
          rowData.status = a.status ? "Approved" : "Pending";
        }

        return rowData;
      })
    );

    // Freeze header
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    // Style header (black text so it’s always visible)
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

    // Light row borders (optional)
    const lastRowNum = worksheet.lastRow?.number ?? 1;
    for (let r = 2; r <= lastRowNum; r++) {
      const row = worksheet.getRow(r);
      row.font = { size: 11, name: "Aptos Narrow", color: { argb: "FF000000" } };
      row.alignment = { vertical: "middle" };
      row.eachCell((c) => {
        c.border = { bottom: { style: "thin", color: { argb: "FFF2F2F2" } } };
      });
    }

    // ---- Auto-fit columns safely (fixes your TS errors) ----
    (worksheet.columns as ExcelJS.Column[]).forEach((col) => {
      // col.values is like: [ , header, row1, row2, ... ] (index 0 is unused)
      const values = (col.values ?? []).slice(1) as ExcelJS.CellValue[];

      // include header text length in width calc
      const headerLen: number =
        col.header != null ? String(col.header).length : 0;

      // Calculate max content length
      let maxContentLen: number = 0;
      for (const v of values) {
        const len = cellValueToTextLen(v);
        if (len > maxContentLen) {
          maxContentLen = len;
        }
      }

      const maxLen: number = Math.max(headerLen, maxContentLen);
      const width: number = Math.min(Math.max(12, maxLen + 2), 50); // clamp

      // width expects a number
      col.width = width;
    });

    // Save
    const timestamp = new Date().toISOString().split("T")[0];
    const finalFilename = `${filename}_${timestamp}.xlsx`;
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

    return { success: true, filename: finalFilename, buffer };
  } catch (error) {
    console.error("Error exporting admin data to Excel:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to export Excel file",
    };
  }
};
