import { Injectable } from '@nestjs/common';
import ExcelJS = require('exceljs');
import puppeteer from 'puppeteer';
import { ReportColumn, ReportResult, ReportRow } from './reports.types';

export type ExportFormat = 'excel' | 'pdf';

export type ExportFile = {
  body: Buffer;
  contentType: string;
  filename: string;
};

type CurrencySettings = {
  currencySymbol: string;
  decimalPlaces: number;
};

const excelContentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const pdfContentType = 'application/pdf';

@Injectable()
export class ReportExportService {
  async exportReport(report: ReportResult, format: ExportFormat, currencySettings: CurrencySettings): Promise<ExportFile> {
    const filenameBase = `${report.key}-${this.dateStamp(report)}`;

    if (format === 'pdf') {
      return {
        body: await this.toPdf(report, currencySettings),
        contentType: pdfContentType,
        filename: `${filenameBase}.pdf`,
      };
    }

    return {
      body: await this.toXlsx(report, currencySettings),
      contentType: excelContentType,
      filename: `${filenameBase}.xlsx`,
    };
  }

  private async toXlsx(report: ReportResult, currencySettings: CurrencySettings) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Restaurant ERP';
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet(this.safeSheetName(report.title), {
      views: [{ rightToLeft: true, showGridLines: false }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const columnCount = report.columns.length;
    worksheet.mergeCells(1, 1, 1, columnCount);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = report.title;
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF17212B' } };
    titleCell.alignment = { horizontal: 'right', vertical: 'middle' };

    worksheet.mergeCells(2, 1, 2, columnCount);
    const descriptionCell = worksheet.getCell(2, 1);
    descriptionCell.value = report.description;
    descriptionCell.font = { size: 11, color: { argb: 'FF647381' } };
    descriptionCell.alignment = { horizontal: 'right', vertical: 'middle' };

    const metaRows = this.filterSummary(report);
    let cursor = 4;
    for (const meta of metaRows) {
      worksheet.getCell(cursor, 1).value = meta.label;
      worksheet.getCell(cursor, 1).font = { bold: true };
      worksheet.getCell(cursor, 2).value = meta.value;
      cursor += 1;
    }

    cursor += 1;
    const headerRow = worksheet.getRow(cursor);
    report.columns.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = column.label;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14746F' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = this.thinBorder();
    });

    const dataStartRow = cursor + 1;
    report.rows.forEach((row, rowIndex) => {
      const excelRow = worksheet.getRow(dataStartRow + rowIndex);
      report.columns.forEach((column, columnIndex) => {
        const cell = excelRow.getCell(columnIndex + 1);
        cell.value = this.excelCellValue(row[column.key], column);
        cell.alignment = {
          horizontal: column.type === 'money' || column.type === 'number' ? 'center' : 'right',
          vertical: 'middle',
        };
        cell.border = this.thinBorder('FFD9E3EC');
        if (column.type === 'money') {
          cell.numFmt = `#,##0.${'0'.repeat(this.decimalPlaces(currencySettings))}`;
        }
      });
    });

    const totalRowIndex = dataStartRow + report.rows.length;
    const totalRow = worksheet.getRow(totalRowIndex);
    report.columns.forEach((column, index) => {
      const cell = totalRow.getCell(index + 1);
      if (index === 0) {
        cell.value = 'مجموع الفترة';
      } else if (column.type === 'money' || column.type === 'number') {
        cell.value = this.sum(report.rows, column.key);
        if (column.type === 'money') cell.numFmt = `#,##0.${'0'.repeat(this.decimalPlaces(currencySettings))}`;
      } else {
        cell.value = '';
      }
      cell.font = { bold: true, color: { argb: 'FF17212B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6F5' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = this.thinBorder();
    });

    cursor = totalRowIndex + 2;
    for (const summary of report.summaries) {
      worksheet.getCell(cursor, 1).value = summary.label;
      worksheet.getCell(cursor, 1).font = { bold: true };
      worksheet.getCell(cursor, 2).value =
        summary.type === 'money' ? Number(summary.value ?? 0) : String(summary.value ?? '');
      if (summary.type === 'money') {
        worksheet.getCell(cursor, 2).numFmt = `#,##0.${'0'.repeat(this.decimalPlaces(currencySettings))}`;
      }
      cursor += 1;
    }

    worksheet.columns = report.columns.map((column) => ({
      key: column.key,
      width: this.excelColumnWidth(column),
    }));
    worksheet.getRow(dataStartRow - 1).height = 24;
    worksheet.autoFilter = {
      from: { row: dataStartRow - 1, column: 1 },
      to: { row: Math.max(dataStartRow - 1, totalRowIndex - 1), column: report.columns.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  }

  private async toPdf(report: ReportResult, currencySettings: CurrencySettings) {
    const landscape = this.pdfLandscape(report);
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(this.toPdfHtml(report, currencySettings, landscape), { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        landscape,
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
      });
      await page.close();
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private toPdfHtml(report: ReportResult, currencySettings: CurrencySettings, landscape: boolean) {
    const metaRows = this.filterSummary(report);
    const totalsRow = this.totalRow(report);
    const columnWidth = `${100 / Math.max(report.columns.length, 1)}%`;
    const rowsHtml = report.rows
      .map((row) => this.pdfTableRow(report.columns, row, currencySettings))
      .join('');
    const totalsHtml = this.pdfTableRow(report.columns, totalsRow, currencySettings, true);
    const summariesHtml = report.summaries
      .map((summary) => {
        const value =
          summary.type === 'money' ? this.formatMoney(summary.value, currencySettings) : String(summary.value ?? '');
        return `
          <div class="summary-item">
            <span>${this.escapeHtml(summary.label)}</span>
            <strong>${this.escapeHtml(value)}</strong>
          </div>
        `;
      })
      .join('');

    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${this.escapeHtml(report.title)}</title>
  <style>
    @page {
      size: A4 ${landscape ? 'landscape' : 'portrait'};
      margin: 12mm 10mm;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      direction: rtl;
      unicode-bidi: plaintext;
      color: #17212b;
      background: #ffffff;
      font-family: Tahoma, "Noto Naskh Arabic", "Noto Sans Arabic", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.55;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .report-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      padding-bottom: 12px;
      border-bottom: 2px solid #14746f;
    }
    h1 {
      margin: 0 0 5px;
      color: #102a33;
      font-size: 20px;
      line-height: 1.35;
      font-weight: 800;
    }
    .description {
      margin: 0;
      color: #536575;
      font-size: 11px;
    }
    .brand {
      min-width: 90px;
      color: #14746f;
      font-weight: 800;
      text-align: left;
      white-space: nowrap;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin: 14px 0;
    }
    .meta-item {
      min-height: 45px;
      padding: 8px 10px;
      border: 1px solid #d9e3ec;
      border-radius: 7px;
      background: #f8fbfc;
    }
    .meta-label {
      display: block;
      margin-bottom: 3px;
      color: #647381;
      font-size: 9px;
    }
    .meta-value {
      color: #17212b;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      direction: rtl;
      page-break-inside: auto;
    }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td {
      width: ${columnWidth};
      padding: 7px 6px;
      border: 1px solid #cfdbe5;
      vertical-align: middle;
      overflow-wrap: anywhere;
    }
    th {
      background: #14746f;
      color: #ffffff;
      font-size: 9.5px;
      font-weight: 800;
      text-align: center;
    }
    td {
      color: #24313f;
      background: #ffffff;
      text-align: right;
    }
    td.number-cell {
      direction: ltr;
      text-align: center;
      font-variant-numeric: tabular-nums;
      unicode-bidi: isolate;
    }
    .total-row td {
      background: #eaf5f3;
      color: #102a33;
      font-weight: 800;
      border-top: 2px solid #14746f;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 14px;
    }
    .summary-item {
      padding: 9px 10px;
      border: 1px solid #d9e3ec;
      border-radius: 7px;
      background: #f8fbfc;
    }
    .summary-item span {
      display: block;
      margin-bottom: 3px;
      color: #647381;
      font-size: 9px;
    }
    .summary-item strong {
      display: block;
      color: #102a33;
      direction: ltr;
      text-align: right;
      font-size: 12px;
    }
    .empty {
      margin-bottom: 10px;
      padding: 24px;
      border: 1px dashed #b8c8d6;
      border-radius: 7px;
      color: #647381;
      text-align: center;
      background: #fbfdfe;
    }
  </style>
</head>
<body>
  <header class="report-header">
    <div>
      <h1>${this.escapeHtml(report.title)}</h1>
      <p class="description">${this.escapeHtml(report.description)}</p>
    </div>
    <div class="brand">Restaurant ERP</div>
  </header>
  <section class="meta-grid">
    ${metaRows
      .map(
        (meta) => `
      <div class="meta-item">
        <span class="meta-label">${this.escapeHtml(meta.label)}</span>
        <span class="meta-value">${this.escapeHtml(String(meta.value ?? ''))}</span>
      </div>
    `,
      )
      .join('')}
  </section>
  ${report.rows.length ? '' : '<div class="empty">لا توجد بيانات ضمن الفلاتر المحددة.</div>'}
  <table>
    <thead>
      <tr>${report.columns.map((column) => `<th>${this.escapeHtml(column.label)}</th>`).join('')}</tr>
    </thead>
    <tbody>${rowsHtml}${totalsHtml}</tbody>
  </table>
  ${summariesHtml ? `<section class="summary-grid">${summariesHtml}</section>` : ''}
</body>
</html>`;
  }

  private pdfTableRow(columns: ReportColumn[], row: ReportRow, currencySettings: CurrencySettings, isTotal = false) {
    return `<tr class="${isTotal ? 'total-row' : ''}">${columns
      .map((column) => {
        const value = this.reportValue(row[column.key], column, currencySettings);
        const className = column.type === 'money' || column.type === 'number' ? 'number-cell' : '';
        return `<td class="${className}">${this.escapeHtml(value)}</td>`;
      })
      .join('')}</tr>`;
  }

  private filterSummary(report: ReportResult) {
    const explicitSummary = report.filterSummary ?? [];
    if (explicitSummary.length) return explicitSummary;

    const filters = report.filters;
    return [
      { label: 'الفرع', value: filters.branchId ?? 'كل الفروع' },
      { label: 'من تاريخ', value: filters.dateFrom ?? 'غير محدد' },
      { label: 'إلى تاريخ', value: filters.dateTo ?? 'غير محدد' },
      ...(filters.search ? [{ label: 'بحث', value: filters.search }] : []),
      ...(filters.categoryId ? [{ label: 'التصنيف', value: filters.categoryId }] : []),
      ...(filters.paymentMethod ? [{ label: 'طريقة الدفع', value: filters.paymentMethod }] : []),
      { label: 'تاريخ التصدير', value: new Date(report.generatedAt).toLocaleString('ar') },
    ];
  }

  private excelCellValue(value: string | number | null, column: ReportColumn) {
    if (column.type === 'money' || column.type === 'number') {
      const numericValue = Number(value ?? 0);
      return Number.isFinite(numericValue) ? numericValue : 0;
    }
    return value ?? '';
  }

  private reportValue(value: string | number | null, column: ReportColumn, currencySettings: CurrencySettings) {
    if (column.type === 'money') return this.formatMoney(value, currencySettings);
    if (column.type === 'number') {
      const numericValue = Number(value ?? 0);
      return new Intl.NumberFormat('ar').format(Number.isFinite(numericValue) ? numericValue : 0);
    }
    return String(value ?? '');
  }

  private totalRow(report: ReportResult): ReportRow {
    return Object.fromEntries(
      report.columns.map((column, index) => {
        if (index === 0) return [column.key, 'مجموع الفترة'];
        if (column.type === 'money' || column.type === 'number') return [column.key, this.sum(report.rows, column.key)];
        return [column.key, ''];
      }),
    );
  }

  private sum(rows: ReportRow[], key: string) {
    return Math.round(rows.reduce((total, row) => total + Number(row[key] ?? 0), 0) * 100) / 100;
  }

  private formatMoney(value: string | number | null, currencySettings: CurrencySettings) {
    const numericValue = Number(value ?? 0);
    return `${new Intl.NumberFormat('ar', {
      minimumFractionDigits: this.decimalPlaces(currencySettings),
      maximumFractionDigits: this.decimalPlaces(currencySettings),
    }).format(Number.isFinite(numericValue) ? numericValue : 0)} ${currencySettings.currencySymbol}`.trim();
  }

  private decimalPlaces(currencySettings: CurrencySettings) {
    return Math.min(Math.max(Math.trunc(currencySettings.decimalPlaces), 0), 4);
  }

  private thinBorder(color = 'FFBFD0DD'): Partial<ExcelJS.Borders> {
    return {
      top: { style: 'thin', color: { argb: color } },
      left: { style: 'thin', color: { argb: color } },
      bottom: { style: 'thin', color: { argb: color } },
      right: { style: 'thin', color: { argb: color } },
    };
  }

  private excelColumnWidth(column: ReportColumn) {
    if (column.type === 'money') return 18;
    if (column.type === 'date') return 14;
    if (column.type === 'number') return 12;
    return Math.max(14, Math.min(28, column.label.length + 10));
  }

  private safeSheetName(title: string) {
    return title.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Report';
  }

  private dateStamp(report: ReportResult) {
    return `${report.filters.dateFrom ?? 'from'}-${report.filters.dateTo ?? new Date().toISOString().slice(0, 10)}`;
  }

  private pdfLandscape(report: ReportResult) {
    return report.columns.length > 6;
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
