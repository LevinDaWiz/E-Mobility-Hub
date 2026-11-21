import { formatDateVi } from "../services/reportEngine";
import type { ReportData } from "../types";

// ===== M1 (UC17): dựng file xuất CSV / XLSX / PDF không cần thư viện ngoài =====
// - CSV: UTF-8 có BOM (Excel đọc đúng tiếng Việt).
// - XLSX: gói OOXML tối thiểu (zip không nén), mở được bằng Excel / LibreOffice.
// - PDF: văn bản (font Courier), không dấu và không có biểu đồ (font chuẩn của PDF không có chữ Việt).

export interface Sheet {
  name: string;
  rows: (string | number)[][];
}

export function reportToSheets(data: ReportData): Sheet[] {
  const f = data.filters;
  const overview: (string | number)[][] = [
    [`Báo cáo: ${data.title}`],
    ["Khoảng thời gian", `${formatDateVi(f.from)} – ${formatDateVi(f.to)}`],
    ["Hub", data.hubLabel],
    ["Phương tiện", data.vehicleLabel],
    ["Tạo lúc", data.generatedAt],
    [],
    ["Chỉ số", "Giá trị", "Ghi chú"],
    ...data.kpis.map((k) => [k.label, k.value, k.sub ?? ""]),
  ];
  return [
    { name: "Tổng quan", rows: overview },
    { name: "Theo ngày", rows: [["Ngày", data.series.unit], ...data.series.byDay.map((p) => [p.title, p.value])] },
    { name: "Theo giờ", rows: [["Giờ", `${data.series.unit} (TB mỗi ngày)`], ...data.series.byHour.map((p) => [p.title, p.value])] },
    {
      name: "Theo Hub",
      rows: [
        data.table.columns,
        ...data.table.rows,
        data.table.total,
        [],
        ["Hub", data.hubBars.tabs[0], data.hubBars.tabs[1]],
        ...data.hubBars.first.map((b, i) => [b.label, b.value, data.hubBars.second[i]?.value ?? ""]),
      ],
    },
    {
      name: "Heatmap",
      rows: [["", ...data.heatmap.columns], ...data.heatmap.rows.map((r) => [r.label, ...r.cells.map((c) => c.text)])],
    },
  ];
}

// ---------- CSV ----------

const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildCsv(sheets: Sheet[]): Uint8Array {
  const text = sheets
    .map((sheet) => [`# ${sheet.name}`, ...sheet.rows.map((r) => r.map(csvCell).join(","))].join("\r\n"))
    .join("\r\n\r\n");
  return new TextEncoder().encode(`\uFEFF${text}\r\n`);
}

// ---------- XLSX (zip không nén) ----------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function zipStore(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.data);

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // tên file UTF-8
    lv.setUint16(8, 0, true); // không nén
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0x0021, true); // 1980-01-01
    lv.setUint32(14, crc, true);
    lv.setUint32(18, entry.data.length, true);
    lv.setUint32(22, entry.data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);

    const cd = new Uint8Array(46 + name.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x0021, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, entry.data.length, true);
    cv.setUint32(24, entry.data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    cd.set(name, 46);

    chunks.push(local, entry.data);
    central.push(cd);
    offset += local.length + entry.data.length;
  }

  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);

  const all = [...chunks, ...central, end];
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
  let pos = 0;
  for (const c of all) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

const xmlEscape = (s: string): string =>
  // eslint-disable-next-line no-control-regex
  s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

// Tên sheet Excel: tối đa 31 ký tự, không chứa \ / ? * [ ] :
const sheetName = (name: string): string => name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet";

export function buildXlsx(sheets: Sheet[]): Uint8Array {
  const enc = new TextEncoder();
  const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

  const sheetXml = (sheet: Sheet): string => {
    const rows = sheet.rows
      .map((row, r) => {
        const cells = row
          .map((value, c) => {
            const ref = `${columnName(c)}${r + 1}`;
            if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
            return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(String(value))}</t></is></c>`;
          })
          .join("");
        return `<row r="${r + 1}">${cells}</row>`;
      })
      .join("");
    return `${head}<worksheet xmlns="${NS}"><sheetData>${rows}</sheetData></worksheet>`;
  };

  const entries: ZipEntry[] = [
    {
      name: "[Content_Types].xml",
      data: enc.encode(
        `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
          .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
          .join("")}</Types>`,
      ),
    },
    {
      name: "_rels/.rels",
      data: enc.encode(
        `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      ),
    },
    {
      name: "xl/workbook.xml",
      data: enc.encode(
        `${head}<workbook xmlns="${NS}" xmlns:r="${REL}"><sheets>${sheets
          .map((s, i) => `<sheet name="${xmlEscape(sheetName(s.name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
          .join("")}</sheets></workbook>`,
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: enc.encode(
        `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
          .map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
          .join("")}</Relationships>`,
      ),
    },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(sheetXml(s)) })),
  ];
  return zipStore(entries);
}

// ---------- PDF (văn bản) ----------

export const foldAscii = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[–—]/g, "-")
    .replace(/→/g, "->")
    .replace(/×/g, "x")
    .replace(/[^\x20-\x7e]/g, "?");

const pdfEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const padCell = (s: string, width: number) => (s.length >= width ? s.slice(0, width) : s + " ".repeat(width - s.length));

function tableLines(columns: string[], rows: string[][], total: string[]): string[] {
  const all = [columns, ...rows, total].map((r) => r.map(foldAscii));
  const widths = columns.map((_, i) => Math.min(24, Math.max(...all.map((r) => (r[i] ?? "").length))));
  const line = (r: string[]) => r.map((c, i) => padCell(c, widths[i])).join("  ").trimEnd();
  const rule = "-".repeat(Math.min(92, widths.reduce((a, b) => a + b, 0) + 2 * (widths.length - 1)));
  return [line(all[0]), rule, ...all.slice(1, -1).map(line), rule, line(all[all.length - 1])];
}

export function reportToPdfLines(data: ReportData): string[] {
  const f = data.filters;
  const lines: string[] = [
    `Khoang thoi gian: ${formatDateVi(f.from)} - ${formatDateVi(f.to)}`,
    `Hub: ${data.hubLabel} | Phuong tien: ${data.vehicleLabel}`,
    `Tao luc: ${data.generatedAt}`,
    "",
    "CHI SO CHINH",
    ...data.kpis.map((k) => `- ${k.label}: ${k.value}${k.sub ? ` (${k.sub})` : ""}`),
    "",
    data.table.title.toUpperCase(),
    ...tableLines(data.table.columns, data.table.rows, data.table.total),
    "",
    data.heatmap.title.toUpperCase(),
    ...tableLines(["", ...data.heatmap.columns], data.heatmap.rows.map((r) => [r.label, ...r.cells.map((c) => c.text)]), ["", ...data.heatmap.columns.map(() => "")]).slice(0, -2),
    "",
    data.series.title.toUpperCase(),
    ...data.series.byDay.map((p) => `${p.title}  ${p.value}${p.weekend ? "  (cuoi tuan)" : ""}`),
  ];
  return lines.flatMap((l) => {
    const text = foldAscii(l);
    const wrapped: string[] = [];
    for (let i = 0; i === 0 || i < text.length; i += 92) wrapped.push(text.slice(i, i + 92));
    return wrapped;
  });
}

export function buildPdf(data: ReportData): Uint8Array {
  const lines = reportToPdfLines(data);
  const title = foldAscii(`BAO CAO: ${data.title}`);
  const perPage = 54;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  if (pages.length === 0) pages.push([]);

  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>";

  pages.forEach((pageLines, i) => {
    const heading = i === 0 ? `BT /F2 13 Tf 40 806 Td (${pdfEscape(title)}) Tj ET\n` : "";
    const body = `BT /F1 9 Tf 12.5 TL 40 ${i === 0 ? 784 : 806} Td ${pageLines.map((l) => `(${pdfEscape(l)}) Tj T*`).join(" ")} ET`;
    const stream = `${heading}${body}\nBT /F1 8 Tf 40 24 Td (Trang ${i + 1}/${pages.length}) Tj ET`;
    objects[5 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`;
    objects[6 + i * 2] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let n = 1; n < objects.length; n++) {
    offsets[n] = pdf.length;
    pdf += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let n = 1; n < objects.length; n++) pdf += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

// ---------- tải xuống ----------

export function downloadBytes(fileName: string, mime: string, bytes: Uint8Array): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
