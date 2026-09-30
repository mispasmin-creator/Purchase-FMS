/**
 * Utility helper to export tabular data to a CSV file with UTF-8 BOM.
 */

export const escapeCsv = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

export const exportToCSV = (filename, headers, rows) => {
  if (!rows || rows.length === 0) {
    return false;
  }

  // Check if headers is array of objects { header/label/title, key/dataKey/accessor }
  const isObjectHeaders = headers.length > 0 && typeof headers[0] === "object" && headers[0] !== null;

  const headerLine = (isObjectHeaders
    ? headers.map((h) => escapeCsv(h.header ?? h.label ?? h.title ?? ""))
    : headers.map(escapeCsv)
  ).join(",");

  const rowLines = rows.map((row) => {
    if (Array.isArray(row)) {
      return row.map(escapeCsv).join(",");
    }
    if (isObjectHeaders) {
      return headers
        .map((h) => {
          if (typeof h.accessor === "function") {
            return escapeCsv(h.accessor(row));
          }
          const key = h.dataKey ?? h.key ?? h.id;
          return escapeCsv(row[key]);
        })
        .join(",");
    }
    return headers.map((h) => escapeCsv(row[h])).join(",");
  });

  const csvContent = [headerLine, ...rowLines].join("\n");
  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const cleanFilename = filename.toLowerCase().endsWith(".csv")
    ? filename
    : `${filename}.csv`;
  link.setAttribute("download", cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
};
