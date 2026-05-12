import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import ExcelJS = require('exceljs');
import puppeteer from 'puppeteer';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  BankAccountTransactionDirection,
  BankAccountTransactionEntity,
  BankAccountTransactionType,
} from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import {
  DrawerTransactionDirection,
  DrawerTransactionEntity,
  DrawerTransactionType,
} from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { VaultTransactionDirection, VaultTransactionEntity, VaultTransactionType } from '../vaults/entities/vault-transaction.entity';
import { DailySaleEntity } from './entities/daily-sale.entity';
import {
  DailySalesClosingDraftData,
  DailySalesClosingEntity,
  DailySalesClosingStatus,
  DailySalesClosingSummary,
} from './entities/daily-sales-closing.entity';
import { UpsertDailySalesClosingDto } from './dto/upsert-daily-sales-closing.dto';

@Injectable()
export class DailySalesClosingService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(DailySalesClosingEntity)
    private readonly closingRepository: Repository<DailySalesClosingEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(DrawerEntity)
    private readonly drawerRepository: Repository<DrawerEntity>,
    @InjectRepository(BankAccountEntity)
    private readonly bankAccountRepository: Repository<BankAccountEntity>,
  ) {}

  findAll(filters: { branchId?: string; dateFrom?: string; dateTo?: string; status?: string }) {
    const query = this.closingRepository
      .createQueryBuilder('closing')
      .leftJoinAndSelect('closing.branch', 'branch')
      .leftJoinAndSelect('closing.drawer', 'drawer')
      .leftJoinAndSelect('closing.bankAccount', 'bankAccount')
      .orderBy('closing.closing_date', 'DESC');
    if (filters.branchId) query.andWhere('closing.branch_id = :branchId', { branchId: filters.branchId });
    if (filters.dateFrom) query.andWhere('closing.closing_date >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo) query.andWhere('closing.closing_date <= :dateTo', { dateTo: filters.dateTo });
    if (filters.status) query.andWhere('closing.status = :status', { status: filters.status });
    return query.getMany();
  }

  async findByIdOrFail(id: string) {
    const closing = await this.closingRepository.findOne({ where: { id } });
    if (!closing) throw new NotFoundException('إقفال المبيعات اليومية غير موجود.');
    return { ...closing, summaryValues: await this.buildSummary(closing) };
  }

  async defaults(branchId: string) {
    await this.ensureBranch(branchId);
    const [drawer, bankAccount] = await Promise.all([
      this.drawerRepository.findOne({ where: { branchId } }),
      this.bankAccountRepository.findOne({ where: { branchId } }),
    ]);
    return { drawerId: drawer?.id ?? null, bankAccountId: bankAccount?.id ?? null };
  }

  async upsertDraft(dto: UpsertDailySalesClosingDto) {
    await this.ensureBranch(dto.branchId);
    const defaults = await this.defaults(dto.branchId);
    const drawerId = dto.drawerId ?? defaults.drawerId;
    const bankAccountId = dto.bankAccountId ?? defaults.bankAccountId;
    await this.ensureDrawerBranch(drawerId, dto.branchId);
    await this.ensureBankAccount(bankAccountId);

    let closing = await this.closingRepository.findOne({ where: { branchId: dto.branchId, closingDate: dto.closingDate } });
    if (closing?.status === DailySalesClosingStatus.Finalized) {
      throw new ConflictException('يوجد إقفال نهائي بالفعل لهذا الفرع وهذا التاريخ.');
    }

    if (!closing) {
      closing = this.closingRepository.create({
        branchId: dto.branchId,
        closingDate: dto.closingDate,
        status: DailySalesClosingStatus.Draft,
      });
    }

    closing.drawerId = drawerId;
    closing.bankAccountId = bankAccountId;
    closing.currentStep = dto.currentStep ?? closing.currentStep ?? 1;
    closing.draftData = this.mergeDraft(closing.draftData, dto.draftData as DailySalesClosingDraftData | null | undefined);
    closing.notes = dto.notes !== undefined ? this.normalizeText(dto.notes) : closing.notes;
    closing.summaryValues = await this.buildSummary(closing);
    closing.handedCashAmount = closing.summaryValues.handedCashAmount;
    closing.expectedCashAmount = closing.summaryValues.expectedSystemCash;
    closing.cashDifferenceAmount = closing.summaryValues.cashDifference;
    return this.closingRepository.save(closing);
  }

  async finalize(id: string) {
    const closing = await this.closingRepository.findOne({ where: { id } });
    if (!closing) throw new NotFoundException('إقفال المبيعات اليومية غير موجود.');
    if (closing.status === DailySalesClosingStatus.Finalized) return closing;
    if (closing.status === DailySalesClosingStatus.Cancelled) throw new BadRequestException('لا يمكن إنهاء إقفال ملغى.');

    await this.ensureNoFinalizedDuplicate(closing.branchId, closing.closingDate, closing.id);
    const summary = await this.buildSummary(closing);
    closing.summaryValues = summary;
    closing.handedCashAmount = summary.handedCashAmount;
    closing.expectedCashAmount = summary.expectedSystemCash;
    closing.cashDifferenceAmount = summary.cashDifference;

    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(DailySalesClosingEntity).save(closing);
      const links = await this.createFinalMovements(saved, manager);
      saved.generatedRecordLinks = links;
      saved.status = DailySalesClosingStatus.Finalized;
      saved.currentStep = 6;
      return manager.getRepository(DailySalesClosingEntity).save(saved);
    });
  }

  async cancel(id: string, reverseFinancialEffect = false) {
    const closing = await this.closingRepository.findOne({ where: { id } });
    if (!closing) throw new NotFoundException('إقفال المبيعات اليومية غير موجود.');
    if (closing.status === DailySalesClosingStatus.Draft) {
      throw new BadRequestException('احذف المسودة بدلا من إلغاء إقفال غير نهائي.');
    }
    return this.dataSource.transaction(async (manager) => {
      if (reverseFinancialEffect) await this.deleteFinalMovements(closing.id, closing.generatedDailySaleId, manager);
      closing.status = DailySalesClosingStatus.Cancelled;
      return manager.getRepository(DailySalesClosingEntity).save(closing);
    });
  }

  async deleteDraft(id: string) {
    const closing = await this.closingRepository.findOne({ where: { id } });
    if (!closing) throw new NotFoundException('إقفال المبيعات اليومية غير موجود.');
    if (closing.status !== DailySalesClosingStatus.Draft) {
      throw new BadRequestException('يمكن حذف المسودات فقط. الإقفالات النهائية تلغى مع عكس الأثر المالي.');
    }
    await this.closingRepository.delete({ id });
    return { deleted: true };
  }

  async exportOne(id: string, format: 'excel' | 'pdf') {
    const closing = await this.findByIdOrFail(id);
    const summary = closing.summaryValues!;
    const lines = [
      ['الفرع', closing.branch?.name ?? ''],
      ['التاريخ', closing.closingDate],
      ['الحالة', this.statusLabel(closing.status)],
      ['مصروفات اليوم', String(summary.expensesAmount)],
      ['مبيعات التوصيل', String(summary.deliverySalesAmount)],
      ['مبيعات الموقع نقدا', String(summary.websiteCashSales)],
      ['مبيعات الموقع بنكيا', String(summary.websiteBankSalesAmount)],
      ['مبيعات داخل الفرع البنكية', String(summary.inStoreCardSalesAmount)],
      ['تحصيلات الجملة النقدية', String(summary.wholesaleCashCollections)],
      ['إجمالي المبيعات اليومية', String(summary.reconciledTotalDailySales)],
      ['المبلغ المستلم من المحاسب', String(summary.handedCashAmount)],
      ['تحويل الخزنة', String(summary.vaultTransferAmount)],
    ];
    if (format === 'pdf') {
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      try {
        const page = await browser.newPage();
        await page.setContent(this.simpleHtml(closing, lines), { waitUntil: 'networkidle0' });
        return {
          body: Buffer.from(await page.pdf({ format: 'A4', landscape: false, printBackground: true })),
          contentType: 'application/pdf',
          filename: `daily-closing-${closing.closingDate}.pdf`,
        };
      } finally {
        await browser.close();
      }
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('إقفال المبيعات اليومية', {
      views: [{ rightToLeft: true, showGridLines: false }],
      pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    worksheet.columns = [
      { header: 'البند', key: 'label', width: 34 },
      { header: 'القيمة', key: 'value', width: 24 },
    ];
    worksheet.mergeCells('A1:B1');
    worksheet.getCell('A1').value = 'مطعم الجود - إقفال المبيعات اليومية';
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getRow(3).values = ['البند', 'القيمة'];
    worksheet.getRow(3).font = { bold: true };
    lines.forEach(([label, value]) => worksheet.addRow({ label, value }));
    return {
      body: Buffer.from(await workbook.xlsx.writeBuffer()),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `daily-closing-${closing.closingDate}.xlsx`,
    };
  }

  private async createFinalMovements(closing: DailySalesClosingEntity, manager: EntityManager) {
    await this.deleteFinalMovements(closing.id, closing.generatedDailySaleId, manager);
    const draft = closing.draftData ?? {};
    const summary = closing.summaryValues ?? (await this.buildSummary(closing));
    const links: { type: string; id: string }[] = [];

    const dailySale = await manager.getRepository(DailySaleEntity).save({
      branchId: closing.branchId,
      salesDate: closing.closingDate,
      cashSalesAmount: summary.cashRetailSales + summary.websiteCashSales,
      drawerId: closing.drawerId,
      bankSalesAmount: summary.deliverySalesAmount + summary.websiteBankSalesAmount + summary.inStoreCardSalesAmount,
      bankAccountId: closing.bankAccountId,
      deliverySalesAmount: summary.deliverySalesAmount,
      websiteSalesAmount: summary.websiteCashSales + summary.websiteBankSalesAmount,
      tipsAmount: 0,
      salesReturnAmount: 0,
      netSalesAmount: summary.deliverySalesAmount + summary.websiteCashSales + summary.websiteBankSalesAmount + summary.inStoreCardSalesAmount,
      notes: closing.notes,
    });
    closing.generatedDailySaleId = dailySale.id;
    links.push({ type: 'daily_sale', id: dailySale.id });

    const websiteDrawerId = draft.websiteSales?.drawerId ?? closing.drawerId;
    if (summary.websiteCashSales > 0 && websiteDrawerId) {
      const transaction = await manager.getRepository(DrawerTransactionEntity).save({
        drawerId: websiteDrawerId,
        branchId: closing.branchId,
        transactionDate: closing.closingDate,
        transactionType: DrawerTransactionType.DailyCashSales,
        direction: DrawerTransactionDirection.In,
        amount: summary.websiteCashSales,
        sourceType: 'daily_sales_closing_website_cash',
        sourceId: closing.id,
        description: `مبيعات الموقع النقدية ${draft.websiteSales?.fromDate ?? closing.closingDate} إلى ${draft.websiteSales?.toDate ?? closing.closingDate}`,
        notes: closing.notes,
      });
      links.push({ type: 'drawer_transaction', id: transaction.id });
    }

    const deliveryBankAccountId = draft.deliverySales?.bankAccountId ?? closing.bankAccountId;
    if (summary.deliverySalesAmount > 0 && deliveryBankAccountId) {
      const transaction = await manager.getRepository(BankAccountTransactionEntity).save({
        bankAccountId: deliveryBankAccountId,
        transactionDate: closing.closingDate,
        transactionType: BankAccountTransactionType.SalesReceiptBank,
        direction: BankAccountTransactionDirection.Incoming,
        amount: summary.deliverySalesAmount,
        branchId: closing.branchId,
        sourceType: 'daily_sales_closing_delivery',
        sourceId: closing.id,
        referenceNumber: closing.id,
        description: `مبيعات التوصيل من ${draft.deliverySales?.fromDate ?? closing.closingDate} إلى ${draft.deliverySales?.toDate ?? closing.closingDate}`,
        notes: closing.notes,
      });
      links.push({ type: 'bank_transaction', id: transaction.id });
    }

    const websiteBankAccountId = draft.websiteSales?.bankAccountId ?? closing.bankAccountId;
    if (summary.websiteBankSalesAmount > 0 && websiteBankAccountId) {
      const transaction = await manager.getRepository(BankAccountTransactionEntity).save({
        bankAccountId: websiteBankAccountId,
        transactionDate: closing.closingDate,
        transactionType: BankAccountTransactionType.SalesReceiptBank,
        direction: BankAccountTransactionDirection.Incoming,
        amount: summary.websiteBankSalesAmount,
        branchId: closing.branchId,
        sourceType: 'daily_sales_closing_website_bank',
        sourceId: closing.id,
        referenceNumber: closing.id,
        description: `مبيعات الموقع البنكية من ${draft.websiteSales?.fromDate ?? closing.closingDate} إلى ${draft.websiteSales?.toDate ?? closing.closingDate}`,
        notes: closing.notes,
      });
      links.push({ type: 'bank_transaction', id: transaction.id });
    }

    const inStoreCardBankAccountId = draft.inStoreCardSales?.bankAccountId ?? closing.bankAccountId;
    if (summary.inStoreCardSalesAmount > 0 && inStoreCardBankAccountId) {
      const transaction = await manager.getRepository(BankAccountTransactionEntity).save({
        bankAccountId: inStoreCardBankAccountId,
        transactionDate: closing.closingDate,
        transactionType: BankAccountTransactionType.SalesReceiptBank,
        direction: BankAccountTransactionDirection.Incoming,
        amount: summary.inStoreCardSalesAmount,
        branchId: closing.branchId,
        sourceType: 'daily_sales_closing_in_store_card',
        sourceId: closing.id,
        referenceNumber: closing.id,
        description: `مبيعات داخل الفرع البنكية بتاريخ ${closing.closingDate}`,
        notes: closing.notes,
      });
      links.push({ type: 'bank_transaction', id: transaction.id });
    }

    const vaultTransfer = draft.vaultTransfer;
    if (vaultTransfer?.enabled && Number(vaultTransfer.amount ?? 0) > 0) {
      if (!closing.drawerId || !vaultTransfer.vaultId) throw new BadRequestException('اختر الدرج والخزنة قبل تحويل النقد.');
      const [drawerTransaction, vaultTransaction] = await Promise.all([
        manager.getRepository(DrawerTransactionEntity).save({
          drawerId: closing.drawerId,
          branchId: closing.branchId,
          transactionDate: closing.closingDate,
          transactionType: DrawerTransactionType.TransferToVault,
          direction: DrawerTransactionDirection.Out,
          amount: vaultTransfer.amount,
          sourceType: 'daily_sales_closing_vault_transfer',
          sourceId: closing.id,
          description: `تحويل نقد إقفال يوم ${closing.closingDate} إلى الخزنة`,
          notes: closing.notes,
        }),
        manager.getRepository(VaultTransactionEntity).save({
          vaultId: vaultTransfer.vaultId,
          transactionDate: closing.closingDate,
          transactionType: VaultTransactionType.DepositFromDrawer,
          direction: VaultTransactionDirection.In,
          amount: vaultTransfer.amount,
          branchId: closing.branchId,
          drawerId: closing.drawerId,
          sourceType: 'daily_sales_closing_vault_transfer',
          sourceId: closing.id,
          referenceNumber: closing.id,
          description: `تحويل نقد إقفال يوم ${closing.closingDate} إلى الخزنة`,
          notes: closing.notes,
        }),
      ]);
      links.push({ type: 'drawer_transaction', id: drawerTransaction.id }, { type: 'vault_transaction', id: vaultTransaction.id });
    }

    return links;
  }

  private async deleteFinalMovements(closingId: string, dailySaleId: string | null | undefined, manager: EntityManager) {
    await Promise.all([
      manager.getRepository(DrawerTransactionEntity).delete({ sourceType: 'daily_sales_closing_website_cash', sourceId: closingId }),
      manager.getRepository(DrawerTransactionEntity).delete({ sourceType: 'daily_sales_closing_vault_transfer', sourceId: closingId }),
      manager.getRepository(BankAccountTransactionEntity).delete({ sourceType: 'daily_sales_closing_delivery', sourceId: closingId }),
      manager.getRepository(BankAccountTransactionEntity).delete({ sourceType: 'daily_sales_closing_website_bank', sourceId: closingId }),
      manager.getRepository(BankAccountTransactionEntity).delete({ sourceType: 'daily_sales_closing_in_store_card', sourceId: closingId }),
      manager.getRepository(VaultTransactionEntity).delete({ sourceType: 'daily_sales_closing_vault_transfer', sourceId: closingId }),
      dailySaleId ? manager.getRepository(DailySaleEntity).delete({ id: dailySaleId }) : Promise.resolve(),
    ]);
  }

  private async buildSummary(closing: Pick<DailySalesClosingEntity, 'branchId' | 'closingDate' | 'drawerId' | 'draftData'>): Promise<DailySalesClosingSummary> {
    const draft = closing.draftData ?? {};
    const [drawerRows, bankRows] = await Promise.all([
      closing.drawerId
        ? this.dataSource.manager.getRepository(DrawerTransactionEntity).find({
            where: { drawerId: closing.drawerId, transactionDate: closing.closingDate },
          })
        : Promise.resolve([]),
      this.dataSource.manager.getRepository(BankAccountTransactionEntity).find({
        where: {
          branchId: closing.branchId,
          transactionDate: closing.closingDate,
          sourceType: 'expense',
          direction: BankAccountTransactionDirection.Outgoing,
        },
      }),
    ]);

    const bySource = (sourceTypes: string[], direction?: DrawerTransactionDirection) =>
      this.roundMoney(
        drawerRows
          .filter((row) => sourceTypes.includes(row.sourceType ?? '') && (!direction || row.direction === direction))
          .reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
      );

    const cashRetailSales = bySource(['daily_sale'], DrawerTransactionDirection.In);
    const wholesaleCashCollections = bySource(['wholesale_sales_payment'], DrawerTransactionDirection.In);
    const cashExpensesFromDrawer = bySource(['expense_payment', 'expense'], DrawerTransactionDirection.Out);
    const cashPurchasesFromDrawer = bySource(['supplier_payment', 'purchase_invoice_payment'], DrawerTransactionDirection.Out);
    const employeeCashOutflowsFromDrawer = bySource(['employee_advance', 'employee_debt'], DrawerTransactionDirection.Out);
    const out = drawerRows.filter((row) => row.direction === DrawerTransactionDirection.Out).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const knownOut = cashExpensesFromDrawer + cashPurchasesFromDrawer + employeeCashOutflowsFromDrawer;
    const websiteCashSales = this.roundMoney(Number(draft.websiteSales?.enabled ? draft.websiteSales.cashAmount ?? 0 : 0));
    const expectedSystemCash = this.roundMoney(
      cashRetailSales + wholesaleCashCollections + websiteCashSales - cashExpensesFromDrawer - cashPurchasesFromDrawer - employeeCashOutflowsFromDrawer,
    );
    const handedCashAmount = this.roundMoney(Number(draft.cashReconciliation?.handedCashAmount ?? 0));
    const drawerPaidExpenses = this.summaryLines(
      drawerRows.filter((row) => ['expense_payment', 'expense'].includes(row.sourceType ?? '') && row.direction === DrawerTransactionDirection.Out),
    );
    const drawerPaidPurchases = this.summaryLines(
      drawerRows.filter((row) => ['supplier_payment', 'purchase_invoice_payment'].includes(row.sourceType ?? '') && row.direction === DrawerTransactionDirection.Out),
    );
    const bankPaidExpenses = this.summaryLines(bankRows);
    const bankPaidExpensesAmount = this.roundMoney(bankRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0));
    const closingExpensesAmount = this.roundMoney(cashExpensesFromDrawer + bankPaidExpensesAmount);
    const reconciledTotalDailySales = this.roundMoney(handedCashAmount + cashExpensesFromDrawer + cashPurchasesFromDrawer + wholesaleCashCollections);

    return {
      expensesAmount: closingExpensesAmount,
      drawerPaidExpensesAmount: cashExpensesFromDrawer,
      bankPaidExpensesAmount,
      drawerPaidExpenses,
      bankPaidExpenses,
      drawerPaidPurchases,
      cashRetailSales,
      wholesaleCashCollections,
      websiteCashSales,
      cashExpensesFromDrawer,
      cashPurchasesFromDrawer,
      employeeCashOutflowsFromDrawer,
      otherDrawerCashEffects: this.roundMoney(out - knownOut),
      expectedSystemCash,
      handedCashAmount,
      cashDifference: this.roundMoney(handedCashAmount - expectedSystemCash),
      reconciledTotalDailySales,
      deliverySalesAmount: this.roundMoney(Number(draft.deliverySales?.enabled ? draft.deliverySales.amount ?? 0 : 0)),
      websiteBankSalesAmount: this.roundMoney(Number(draft.websiteSales?.enabled ? draft.websiteSales.bankAmount ?? 0 : 0)),
      inStoreCardSalesAmount: this.roundMoney(Number(draft.inStoreCardSales?.amount ?? 0)),
      vaultTransferAmount: this.roundMoney(Number(draft.vaultTransfer?.enabled ? draft.vaultTransfer.amount ?? 0 : 0)),
    };
  }

  private mergeDraft(current: DailySalesClosingDraftData | null, next?: DailySalesClosingDraftData | null) {
    if (!next) return current ?? {};
    return {
      ...(current ?? {}),
      ...next,
      deliverySales: { ...(current?.deliverySales ?? {}), ...(next.deliverySales ?? {}) },
      websiteSales: { ...(current?.websiteSales ?? {}), ...(next.websiteSales ?? {}) },
      inStoreCardSales: { ...(current?.inStoreCardSales ?? {}), ...(next.inStoreCardSales ?? {}) },
      cashReconciliation: { ...(current?.cashReconciliation ?? {}), ...(next.cashReconciliation ?? {}) },
      vaultTransfer: { ...(current?.vaultTransfer ?? {}), ...(next.vaultTransfer ?? {}) },
    };
  }

  private async ensureNoFinalizedDuplicate(branchId: string, closingDate: string, currentId: string) {
    const existing = await this.closingRepository.findOne({ where: { branchId, closingDate, status: DailySalesClosingStatus.Finalized } });
    if (existing && existing.id !== currentId) throw new ConflictException('يوجد إقفال نهائي بالفعل لهذا الفرع وهذا التاريخ.');
  }

  private async ensureBranch(id: string) {
    const branch = await this.branchRepository.findOne({ where: { id } });
    if (!branch) throw new NotFoundException('الفرع غير موجود.');
  }

  private async ensureDrawerBranch(drawerId: string | null | undefined, branchId: string) {
    if (!drawerId) return;
    const drawer = await this.drawerRepository.findOne({ where: { id: drawerId } });
    if (!drawer) throw new NotFoundException('الدرج غير موجود.');
    if (drawer.branchId !== branchId) throw new BadRequestException('الدرج يجب أن يتبع نفس الفرع.');
  }

  private async ensureBankAccount(bankAccountId: string | null | undefined) {
    if (!bankAccountId) return;
    const bank = await this.bankAccountRepository.findOne({ where: { id: bankAccountId } });
    if (!bank) throw new NotFoundException('الحساب البنكي غير موجود.');
  }

  private simpleHtml(closing: { notes?: string | null }, lines: string[][]) {
    return `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><body style="font-family:Tahoma,Arial,sans-serif;padding:28px"><h1>مطعم الجود</h1><h2>إقفال المبيعات اليومية</h2><table style="width:100%;border-collapse:collapse">${lines
      .map(([key, value]) => `<tr><th style="border:1px solid #ddd;padding:8px;text-align:right">${key}</th><td style="border:1px solid #ddd;padding:8px">${value}</td></tr>`)
      .join('')}</table><p>${closing.notes ?? ''}</p></body></html>`;
  }

  private normalizeText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private statusLabel(status: DailySalesClosingStatus) {
    if (status === DailySalesClosingStatus.Finalized) return 'نهائي';
    if (status === DailySalesClosingStatus.Cancelled) return 'ملغى';
    return 'مسودة';
  }

  private summaryLines(rows: { id: string; description: string; amount: number }[]) {
    return rows.map((row) => ({
      id: row.id,
      description: row.description,
      amount: this.roundMoney(Number(row.amount ?? 0)),
    }));
  }
}
