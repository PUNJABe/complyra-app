"use client";

type ExportCell = string | number | boolean | null | undefined;
type ExportRow = Record<string, ExportCell>;

/**
 * Generates a CSV file from data and triggers download
 * CSV format is compatible with Excel
 */
export function exportToCSV(
  data: ExportRow[],
  filename: string = "export.csv"
) {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csv = [
    headers.join(","), // Header row
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape commas and quotes in values
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? "";
        })
        .join(",")
    ),
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a formatted report with headers and data
 */
export function generateReport(
  title: string,
  data: ExportRow[],
  filename: string = "report.csv"
) {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const timestamp = new Date().toISOString().split("T")[0];

  const csv = [
    title,
    `Report Generated: ${new Date().toLocaleString()}`,
    "",
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? "";
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${timestamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Renders a simple printable report and opens browser print dialog for PDF export.
 */
export function exportToPDF(
  title: string,
  rows: Array<Record<string, string | number>>,
  subtitle?: string
) {
  if (!rows.length) {
    alert("No data to export");
    return;
  }

  const headers = Object.keys(rows[0]);
  const tableHead = headers.map((header) => `<th>${header}</th>`).join("");
  const tableRows = rows
    .map(
      (row) =>
        `<tr>${headers
          .map((header) => `<td>${String(row[header] ?? "")}</td>`)
          .join("")}</tr>`
    )
    .join("");

  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin: 0 0 6px 0; }
          p { margin: 0 0 16px 0; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>${subtitle ?? `Generated ${new Date().toLocaleString()}`}</p>
        <table>
          <thead><tr>${tableHead}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const win = window.open("", "_blank");
  if (!win) {
    alert("Popup blocked. Allow popups to export PDF.");
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
