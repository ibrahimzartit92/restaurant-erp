import { Injectable } from '@nestjs/common';
import ExcelJS = require('exceljs');
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument = require('pdfkit');
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
      if (summary.type === 'money') worksheet.getCell(cursor, 2).numFmt = `#,##0.${'0'.repeat(this.decimalPlaces(currencySettings))}`;
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
    const document = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 28,
      bufferPages: true,
      autoFirstPage: true,
      info: { Title: report.title, Author: 'Restaurant ERP' },
    });
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));

    const fontPath = this.resolveFontPath();
    if (fontPath) {
      document.font(fontPath);
    }

    const pageWidth = document.page.width - document.page.margins.left - document.page.margins.right;
    let y = document.page.margins.top;
    document.fontSize(18).fillColor('#17212b').text(report.title, document.page.margins.left, y, {
      width: pageWidth,
      align: 'right',
    });
    y += 28;
    document.fontSize(10).fillColor('#647381').text(report.description, document.page.margins.left, y, {
      width: pageWidth,
      align: 'right',
    });
    y += 24;

    for (const meta of this.filterSummary(report)) {
      document.fontSize(9).fillColor('#405060').text(`${meta.label}: ${meta.value}`, document.page.margins.left, y, {
        width: pageWidth,
        align: 'right',
      });
      y += 15;
    }
    y += 8;

    const columns = this.pdfColumns(report.columns, pageWidth);
    y = this.drawPdfHeader(document, columns, y);
    for (const row of report.rows) {
      if (y > document.page.height - document.page.margins.bottom - 46) {
        document.addPage();
        y = document.page.margins.top;
        y = this.drawPdfHeader(document, columns, y);
      }
      y = this.drawPdfRow(document, columns, row, y, currencySettings);
    }

    const totalsRow = this.totalRow(report);
    if (y > document.page.height - document.page.margins.bottom - 46) {
      document.addPage();
      y = document.page.margins.top;
      y = this.drawPdfHeader(document, columns, y);
    }
    y = this.drawPdfRow(document, columns, totalsRow, y, currencySettings, true);

    y += 14;
    for (const summary of report.summaries) {
      document.fontSize(9).fillColor('#17212b').text(
        `${summary.label}: ${summary.type === 'money' ? this.formatMoney(summary.value, currencySettings) : summary.value}`,
        document.page.margins.left,
        y,
        { width: pageWidth, align: 'right' },
      );
      y += 15;
    }

    document.end();
    await new Promise<void>((resolve) => document.on('end', resolve));
    return Buffer.concat(chunks);
  }

  private drawPdfHeader(document: PDFKit.PDFDocument, columns: PdfColumn[], y: number) {
    const rowHeight = 24;
    document.save().rect(document.page.margins.left, y, this.columnsWidth(columns), rowHeight).fill('#14746f').restore();
    columns.forEach((column) => {
      document
        .fontSize(8)
        .fillColor('#ffffff')
        .text(column.label, column.x + 4, y + 7, { width: column.width - 8, align: 'right' });
    });
    return y + rowHeight;
  }

  private drawPdfRow(
    document: PDFKit.PDFDocument,
    columns: PdfColumn[],
    row: ReportRow,
    y: number,
    currencySettings: CurrencySettings,
    isTotal = false,
  ) {
    const rowHeight = 24;
    const fill = isTotal ? '#eff6f5' : '#ffffff';
    document.save().rect(document.page.margins.left, y, this.columnsWidth(columns), rowHeight).fill(fill).restore();
    columns.forEach((column) => {
      const rawValue = row[column.key];
      const value = column.type === 'money' ? this.formatMoney(rawValue, currencySettings) : String(rawValue ?? '');
      document
        .fontSize(8)
        .fillColor(isTotal ? '#17212b' : '#24313f')
        .text(value, column.x + 4, y + 7, { width: column.width - 8, align: column.type === 'money' ? 'center' : 'right' });
      document.strokeColor('#d9e3ec').rect(column.x, y, column.width, rowHeight).stroke();
    });
    return y + rowHeight;
  }

  private pdfColumns(columns: ReportColumn[], pageWidth: number): PdfColumn[] {
    const minWidth = 58;
    const baseWidths = columns.map((column) => {
      if (column.type === 'money') return 86;
      if (column.type === 'date') return 72;
      if (column.type === 'number') return 62;
      return 100;
    });
    const total = baseWidths.reduce((sum, width) => sum + width, 0);
    const scale = pageWidth / Math.max(total, pageWidth);
    let x = pageWidth + 28;
    return columns.map((column, index) => {
      const width = Math.max(minWidth, Math.floor(baseWidths[index] * scale));
      x -= width;
      return { ...column, x, width };
    });
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

  private columnsWidth(columns: PdfColumn[]) {
    return columns.reduce((sum, column) => sum + column.width, 0);
  }

  private resolveFontPath() {
    const candidates = [
      path.join(process.cwd(), 'assets', 'fonts', 'NotoNaskhArabic-Regular.ttf'),
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf',
      'C:\\Windows\\Fonts\\tahoma.ttf',
    ];

    return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
  }
}

type PdfColumn = ReportColumn & {
  x: number;
  width: number;
};
