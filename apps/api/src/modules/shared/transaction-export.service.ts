import { Injectable } from '@nestjs/common';
import ExcelJS = require('exceljs');
import puppeteer from 'puppeteer';
import { arabicDisplayLabel } from './display-labels';

export type TransactionExportFormat = 'excel' | 'pdf';

export type TransactionExportFile = {
  body: Buffer;
  contentType: string;
  filename: string;
};

export type TransactionExportRow = {
  date: string;
  account: string;
  type: string;
  reference: string;
  description: string;
  source: string;
  incomingAmount: number;
  outgoingAmount: number;
};

export type TransactionExportInput = {
  key: string;
  title: string;
  description: string;
  rows: TransactionExportRow[];
  filterSummary: { label: string; value: string }[];
  format: TransactionExportFormat;
};

const excelContentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const pdfContentType = 'application/pdf';

@Injectable()
export class TransactionExportService {
  async exportTransactions(input: TransactionExportInput): Promise<TransactionExportFile> {
    const filenameBase = `${input.key}-${new Date().toISOString().slice(0, 10)}`;
    const localizedInput = this.localizeInput(input);

    if (localizedInput.format === 'pdf') {
      return {
        body: await this.toPdf(localizedInput),
        contentType: pdfContentType,
        filename: `${filenameBase}.pdf`,
      };
    }

    return {
      body: await this.toExcel(localizedInput),
      contentType: excelContentType,
      filename: `${filenameBase}.xlsx`,
    };
  }

  private localizeInput(input: TransactionExportInput): TransactionExportInput {
    return {
      ...input,
      filterSummary: input.filterSummary.map((item) => ({
        ...item,
        value: arabicDisplayLabel(item.value),
      })),
      rows: input.rows.map((row) => ({
        ...row,
        type: arabicDisplayLabel(row.type),
        reference: arabicDisplayLabel(row.reference, row.reference),
        source: arabicDisplayLabel(row.source, row.source),
      })),
    };
  }

  private async toExcel(input: TransactionExportInput) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Restaurant ERP';
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet(this.safeSheetName(input.title), {
      views: [{ rightToLeft: true, showGridLines: false }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const columns = this.columns();
    worksheet.mergeCells(1, 1, 1, columns.length);
    worksheet.getCell(1, 1).value = input.title;
    worksheet.getCell(1, 1).font = { bold: true, size: 16 };
    worksheet.getCell(1, 1).alignment = { horizontal: 'right' };

    worksheet.mergeCells(2, 1, 2, columns.length);
    worksheet.getCell(2, 1).value = input.description;
    worksheet.getCell(2, 1).alignment = { horizontal: 'right' };

    let cursor = 4;
    for (const filter of input.filterSummary) {
      worksheet.getCell(cursor, 1).value = filter.label;
      worksheet.getCell(cursor, 1).font = { bold: true };
      worksheet.getCell(cursor, 2).value = filter.value;
      cursor += 1;
    }

    const totals = this.totals(input.rows);
    for (const summary of [
      ['إجمالي الداخل', totals.incoming],
      ['إجمالي الخارج', totals.outgoing],
      ['الصافي', totals.net],
    ] as const) {
      worksheet.getCell(cursor, 1).value = summary[0];
      worksheet.getCell(cursor, 1).font = { bold: true };
      worksheet.getCell(cursor, 2).value = summary[1];
      worksheet.getCell(cursor, 2).numFmt = '#,##0.00';
      cursor += 1;
    }

    cursor += 1;
    const headerRow = worksheet.getRow(cursor);
    columns.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = column.label;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14746F' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = this.thinBorder();
    });

    const dataStartRow = cursor + 1;
    input.rows.forEach((row, rowIndex) => {
      const excelRow = worksheet.getRow(dataStartRow + rowIndex);
      columns.forEach((column, columnIndex) => {
        const cell = excelRow.getCell(columnIndex + 1);
        cell.value = column.value(row);
        cell.alignment = { horizontal: column.money ? 'center' : 'right' };
        cell.border = this.thinBorder('FFD9E3EC');
        if (column.money) cell.numFmt = '#,##0.00';
      });
    });

    const totalRow = worksheet.getRow(dataStartRow + input.rows.length);
    columns.forEach((column, index) => {
      const cell = totalRow.getCell(index + 1);
      if (index === 0) cell.value = 'مجموع الفترة';
      else if (column.key === 'incomingAmount') cell.value = totals.incoming;
      else if (column.key === 'outgoingAmount') cell.value = totals.outgoing;
      else cell.value = '';
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6F5' } };
      cell.border = this.thinBorder();
      if (column.money) cell.numFmt = '#,##0.00';
    });

    worksheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  }

  private async toPdf(input: TransactionExportInput) {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(this.toHtml(input), { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private toHtml(input: TransactionExportInput) {
    const columns = this.columns();
    const totals = this.totals(input.rows);
    return `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">
      <style>
        body{font-family:Tahoma,Arial,sans-serif;color:#17212b;margin:0;font-size:11px;direction:rtl}
        h1{font-size:20px;margin:0 0 4px} p{margin:0;color:#647381}
        .header{border-bottom:2px solid #14746f;padding-bottom:12px;margin-bottom:12px}
        .meta,.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}
        .box{border:1px solid #d9e3ec;border-radius:7px;background:#f8fbfc;padding:8px}
        .box span{display:block;color:#647381;font-size:9px}.box strong{display:block;margin-top:3px}
        table{width:100%;border-collapse:collapse;table-layout:fixed} th,td{border:1px solid #cfdbe5;padding:6px;overflow-wrap:anywhere}
        th{background:#14746f;color:#fff;text-align:center} td{text-align:right}.num{text-align:center;direction:ltr}
        .total td{background:#eaf5f3;font-weight:700}
      </style>
      <body>
        <section class="header"><h1>${this.escape(input.title)}</h1><p>${this.escape(input.description)}</p></section>
        <section class="meta">${input.filterSummary.map((item) => `<div class="box"><span>${this.escape(item.label)}</span><strong>${this.escape(item.value)}</strong></div>`).join('')}</section>
        <section class="summary">
          <div class="box"><span>إجمالي الداخل</span><strong>${this.formatNumber(totals.incoming)}</strong></div>
          <div class="box"><span>إجمالي الخارج</span><strong>${this.formatNumber(totals.outgoing)}</strong></div>
          <div class="box"><span>الصافي</span><strong>${this.formatNumber(totals.net)}</strong></div>
          <div class="box"><span>عدد الحركات</span><strong>${this.formatNumber(input.rows.length)}</strong></div>
        </section>
        <table><thead><tr>${columns.map((column) => `<th>${this.escape(column.label)}</th>`).join('')}</tr></thead>
        <tbody>
          ${input.rows.map((row) => `<tr>${columns.map((column) => `<td class="${column.money ? 'num' : ''}">${this.escape(String(column.money ? this.formatNumber(Number(column.value(row))) : column.value(row)))}</td>`).join('')}</tr>`).join('')}
          <tr class="total">${columns.map((column, index) => `<td class="${column.money ? 'num' : ''}">${index === 0 ? 'مجموع الفترة' : column.key === 'incomingAmount' ? this.formatNumber(totals.incoming) : column.key === 'outgoingAmount' ? this.formatNumber(totals.outgoing) : ''}</td>`).join('')}</tr>
        </tbody></table>
      </body></html>`;
  }

  private columns() {
    return [
      { key: 'date', label: 'التاريخ', width: 14, value: (row: TransactionExportRow) => row.date },
      { key: 'account', label: 'الحساب / الوعاء', width: 22, value: (row: TransactionExportRow) => row.account },
      { key: 'type', label: 'نوع الحركة', width: 20, value: (row: TransactionExportRow) => row.type },
      { key: 'reference', label: 'المرجع', width: 18, value: (row: TransactionExportRow) => row.reference },
      { key: 'description', label: 'الوصف', width: 32, value: (row: TransactionExportRow) => row.description },
      { key: 'source', label: 'المصدر / الوجهة', width: 22, value: (row: TransactionExportRow) => row.source },
      { key: 'incomingAmount', label: 'المبلغ الداخل', width: 16, money: true, value: (row: TransactionExportRow) => row.incomingAmount },
      { key: 'outgoingAmount', label: 'المبلغ الخارج', width: 16, money: true, value: (row: TransactionExportRow) => row.outgoingAmount },
    ];
  }

  private totals(rows: TransactionExportRow[]) {
    const incoming = this.round(rows.reduce((sum, row) => sum + Number(row.incomingAmount ?? 0), 0));
    const outgoing = this.round(rows.reduce((sum, row) => sum + Number(row.outgoingAmount ?? 0), 0));
    return { incoming, outgoing, net: this.round(incoming - outgoing) };
  }

  private round(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private formatNumber(value: number) {
    return new Intl.NumberFormat('ar', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  private safeSheetName(title: string) {
    return title.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Transactions';
  }

  private thinBorder(color = 'FFBFD0DD'): Partial<ExcelJS.Borders> {
    return {
      top: { style: 'thin', color: { argb: color } },
      left: { style: 'thin', color: { argb: color } },
      bottom: { style: 'thin', color: { argb: color } },
      right: { style: 'thin', color: { argb: color } },
    };
  }

  private escape(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
