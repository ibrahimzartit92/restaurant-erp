import Link from 'next/link';
import { fetchList, formatDate, formatMoney } from '../lib/api';
import { getCurrentUser } from '../lib/server-auth';
import type {
  AttendanceFileSummary,
  BankAccountSummary,
  BankAccountTransactionSummary,
  BranchOption,
  BranchTransferSummary,
  EmployeeAdvanceSummary,
  EmployeePenaltySummary,
  EmployeeSummary,
  PayrollSummary,
  StockCountSummary,
} from '../lib/types';

type ExpenseSummaryRow = {
  id: string;
  amount: number;
  expenseDate?: string;
  title?: string;
  branchId?: string;
  createdAt?: string;
};

type DailySaleSummaryRow = {
  id: string;
  branchId: string;
  salesDate: string;
  cashSalesAmount: number;
  bankSalesAmount: number;
  deliverySalesAmount: number;
  websiteSalesAmount: number;
  tipsAmount?: number;
  salesReturnAmount?: number;
  netSalesAmount: number;
  createdAt?: string;
};

type DrawerSessionSummaryRow = {
  id: string;
  drawerId?: string;
  drawer?: { name?: string } | null;
  branchId: string;
  sessionDate: string;
  openingBalance: number;
  closingBalance?: number | null;
  calculatedBalance: number;
  differenceAmount: number;
  status: string;
  createdAt?: string;
};

type DrawerTransactionSummaryRow = {
  id: string;
  branchId: string;
  drawerId?: string;
  transactionDate: string;
  transactionType: string;
  direction: string;
  amount: number;
  description: string;
  createdAt?: string;
};

type PurchaseInvoiceSummaryRow = {
  id: string;
  invoiceNumber: string;
  invoiceLabel?: string | null;
  branchId: string;
  branch?: BranchOption | null;
  supplier?: { name?: string | null } | null;
  invoiceDate: string;
  dueDate?: string | null;
  status: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  createdAt?: string;
};

type SupplierPaymentSummaryRow = {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  branchId: string;
  branch?: BranchOption | null;
  purchaseInvoice?: { invoiceNumber?: string } | null;
  createdAt?: string;
};

type DashboardActivity = {
  id: string;
  label: string;
  meta: string;
  amount?: string;
  date: string;
};

type DashboardAlert = {
  id: string;
  title: string;
  detail: string;
  tone?: 'default' | 'warning';
};

const quickActions = [
  { href: '/daily-sales/new', label: 'إضافة مبيعات يومية' },
  { href: '/expenses/new', label: 'إضافة مصروف' },
  { href: '/purchase-invoices', label: 'إضافة فاتورة شراء' },
  { href: '/supplier-payments', label: 'إضافة دفعة مورد' },
  { href: '/drawer-daily-sessions/new', label: 'فتح جلسة درج' },
  { href: '/transfers/new', label: 'إضافة تحويل بين الفروع' },
] as const;

function normalizeDate(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

function isWithinDateRange(value: string | undefined, dateFrom?: string, dateTo?: string) {
  if (!value) {
    return true;
  }

  const normalizedValue = normalizeDate(value);

  if (dateFrom && normalizedValue < dateFrom) {
    return false;
  }

  if (dateTo && normalizedValue > dateTo) {
    return false;
  }

  return true;
}

function byBranch<T extends { branchId?: string | null }>(rows: T[], branchId?: string) {
  if (!branchId) {
    return rows;
  }

  return rows.filter((row) => row.branchId === branchId);
}

function byDate<T>(rows: T[], getDate: (row: T) => string | undefined, dateFrom?: string, dateTo?: string) {
  return rows.filter((row) => isWithinDateRange(getDate(row), dateFrom, dateTo));
}

function sumAbsolute(values: number[]) {
  return values.reduce((sum, value) => sum + Math.abs(value), 0);
}

function getRoleView(roleCode?: string) {
  switch (roleCode) {
    case 'accountant':
      return {
        title: 'عرض محاسبي',
        note: 'تركيز أعلى على التدفقات المالية والبنوك والموردين.',
      };
    case 'branch_manager':
      return {
        title: 'عرض مدير الفرع',
        note: 'تركيز أعلى على التشغيل اليومي والدرج والمخزون داخل الفرع.',
      };
    default:
      return {
        title: 'عرض الإدارة',
        note: 'لوحة شاملة تجمع مؤشرات المطعم الرئيسية في مكان واحد.',
      };
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const branchId = params.branch_id;
  const dateFrom = params.date_from;
  const dateTo = params.date_to;

  const [
    currentUser,
    branches,
    expenses,
    dailySales,
    drawerSessions,
    drawerTransactions,
    bankAccounts,
    bankTransactions,
    purchaseInvoices,
    supplierPayments,
    items,
    transfers,
    stockCounts,
    employees,
    advances,
    penalties,
    payrolls,
    attendanceFiles,
  ] = await Promise.all([
    getCurrentUser(),
    fetchList<BranchOption>('/branches'),
    fetchList<ExpenseSummaryRow>('/expenses'),
    fetchList<DailySaleSummaryRow>('/daily-sales'),
    fetchList<DrawerSessionSummaryRow>('/drawer-daily-sessions'),
    fetchList<DrawerTransactionSummaryRow>('/drawer-transactions'),
    fetchList<BankAccountSummary>('/bank-accounts'),
    fetchList<BankAccountTransactionSummary>('/bank-account-transactions'),
    fetchList<PurchaseInvoiceSummaryRow>('/purchase-invoices'),
    fetchList<SupplierPaymentSummaryRow>('/supplier-payments'),
    fetchList<{ id: string }>('/items'),
    fetchList<BranchTransferSummary>('/transfers'),
    fetchList<StockCountSummary>('/stock-counts'),
    fetchList<EmployeeSummary>('/employees'),
    fetchList<EmployeeAdvanceSummary>('/employee-advances'),
    fetchList<EmployeePenaltySummary>('/employee-penalties'),
    fetchList<PayrollSummary>('/payrolls'),
    fetchList<AttendanceFileSummary>('/attendance-files'),
  ]);

  const roleView = getRoleView(currentUser?.role.code);

  const filteredDailySales = byDate(byBranch(dailySales.data, branchId), (row) => row.salesDate, dateFrom, dateTo);
  const filteredExpenses = byDate(byBranch(expenses.data, branchId), (row) => row.expenseDate, dateFrom, dateTo);
  const filteredDrawerSessions = byDate(byBranch(drawerSessions.data, branchId), (row) => row.sessionDate, dateFrom, dateTo);
  const filteredDrawerTransactions = byDate(byBranch(drawerTransactions.data, branchId), (row) => row.transactionDate, dateFrom, dateTo);
  const filteredBankTransactions = byDate(byBranch(bankTransactions.data, branchId), (row) => row.transactionDate, dateFrom, dateTo);
  const filteredPurchaseInvoices = byDate(
    byBranch(purchaseInvoices.data, branchId),
    (row) => row.invoiceDate,
    dateFrom,
    dateTo,
  );
  const filteredSupplierPayments = byDate(
    byBranch(supplierPayments.data, branchId),
    (row) => row.paymentDate,
    dateFrom,
    dateTo,
  );
  const filteredTransfers = byDate(
    transfers.data.filter(
      (row) => !branchId || row.fromBranchId === branchId || row.toBranchId === branchId,
    ),
    (row) => row.transferDate,
    dateFrom,
    dateTo,
  );
  const filteredStockCounts = byDate(byBranch(stockCounts.data, branchId), (row) => row.countDate, dateFrom, dateTo);
  const filteredAttendanceFiles = attendanceFiles.data.filter((row) => {
    if (branchId && row.branchId && row.branchId !== branchId) {
      return false;
    }

    if (dateFrom && `${row.year}-${String(row.month).padStart(2, '0')}-01` < dateFrom.slice(0, 7) + '-01') {
      return false;
    }

    if (dateTo && `${row.year}-${String(row.month).padStart(2, '0')}-01` > dateTo.slice(0, 7) + '-31') {
      return false;
    }

    return true;
  });

  const grossSales = filteredDailySales.reduce(
    (sum, sale) =>
      sum +
      Number(sale.cashSalesAmount ?? 0) +
      Number(sale.bankSalesAmount ?? 0) +
      Number(sale.deliverySalesAmount ?? 0) +
      Number(sale.websiteSalesAmount ?? 0),
    0,
  );
  const cashSales = filteredDailySales.reduce((sum, sale) => sum + Number(sale.cashSalesAmount ?? 0), 0);
  const nonCashSales = filteredDailySales.reduce(
    (sum, sale) =>
      sum +
      Number(sale.bankSalesAmount ?? 0) +
      Number(sale.deliverySalesAmount ?? 0) +
      Number(sale.websiteSalesAmount ?? 0),
    0,
  );
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
  const tipsAmount = filteredDailySales.reduce((sum, sale) => sum + Number(sale.tipsAmount ?? 0), 0);
  const returnsAmount = filteredDailySales.reduce((sum, sale) => sum + Number(sale.salesReturnAmount ?? 0), 0);
  const netSales = filteredDailySales.reduce((sum, sale) => sum + Number(sale.netSalesAmount ?? 0), 0);
  const netDay = netSales - totalExpenses;

  const referenceDrawerSession =
    [...filteredDrawerSessions].sort((a, b) => normalizeDate(b.sessionDate).localeCompare(normalizeDate(a.sessionDate)))[0] ??
    null;
  const drawerOpeningBalance = Number(referenceDrawerSession?.openingBalance ?? 0);
  const drawerCalculatedBalance = Number(referenceDrawerSession?.calculatedBalance ?? 0);
  const drawerClosingBalance = Number(referenceDrawerSession?.closingBalance ?? 0);
  const drawerDifference = Number(referenceDrawerSession?.differenceAmount ?? 0);
  const drawerCashIn = filteredDrawerTransactions
    .filter((transaction) => transaction.direction === 'in')
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
  const drawerCashOut = filteredDrawerTransactions
    .filter((transaction) => transaction.direction === 'out')
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);

  const totalBankBalance = bankAccounts.data.reduce((sum, account) => sum + Number(account.currentBalance ?? 0), 0);
  const totalDeposits = filteredBankTransactions
    .filter((transaction) => transaction.transactionType === 'deposit')
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
  const totalWithdrawals = filteredBankTransactions
    .filter((transaction) => transaction.transactionType === 'withdrawal')
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
  const totalTransfers = filteredBankTransactions
    .filter((transaction) => transaction.transactionType === 'transfer')
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
  const recentSettlements = filteredBankTransactions
    .filter((transaction) => transaction.transactionType === 'settlement')
    .slice(0, 3);

  const openInvoices = filteredPurchaseInvoices.filter((invoice) =>
    ['open', 'partially_paid'].includes(invoice.status),
  );
  const overdueInvoices = openInvoices.filter(
    (invoice) => invoice.dueDate && normalizeDate(invoice.dueDate) < new Date().toISOString().slice(0, 10),
  );
  const totalSupplierDue = openInvoices.reduce((sum, invoice) => sum + Number(invoice.remainingAmount ?? 0), 0);
  const recentOpenInvoices = [...openInvoices]
    .sort((a, b) => normalizeDate(a.dueDate).localeCompare(normalizeDate(b.dueDate)))
    .slice(0, 5);
  const latestSupplierPayments = [...filteredSupplierPayments]
    .sort((a, b) => normalizeDate(b.paymentDate).localeCompare(normalizeDate(a.paymentDate)))
    .slice(0, 4);

  const transferCount = filteredTransfers.length;
  const stockCountCount = filteredStockCounts.length;
  const totalStockDifference = filteredStockCounts.reduce(
    (sum, count) =>
      sum + count.items.reduce((itemSum, item) => itemSum + Math.abs(Number(item.differenceQuantity ?? 0)), 0),
    0,
  );
  const inventoryTableMode = filteredTransfers.length >= filteredStockCounts.length ? 'transfers' : 'counts';
  const latestTransfers = [...filteredTransfers]
    .sort((a, b) => normalizeDate(b.transferDate).localeCompare(normalizeDate(a.transferDate)))
    .slice(0, 5);
  const latestStockCounts = [...filteredStockCounts]
    .sort((a, b) => normalizeDate(b.countDate).localeCompare(normalizeDate(a.countDate)))
    .slice(0, 5);

  const employeeCount = employees.data.length;
  const totalAdvances = advances.data.reduce((sum, advance) => sum + Number(advance.amount ?? 0), 0);
  const totalPenalties = penalties.data.reduce((sum, penalty) => sum + Number(penalty.amount ?? 0), 0);
  const totalPayrolls = payrolls.data.reduce((sum, payroll) => sum + Number(payroll.netSalary ?? 0), 0);
  const recentEmployeeActivity: DashboardActivity[] = [
    ...payrolls.data.slice(0, 3).map((payroll) => ({
      id: `payroll-${payroll.id}`,
      label: 'راتب شهري',
      meta: `${payroll.employee.fullName} • ${payroll.payrollMonth}/${payroll.payrollYear}`,
      amount: formatMoney(payroll.netSalary),
      date: `${payroll.payrollYear}-${String(payroll.payrollMonth).padStart(2, '0')}-01`,
    })),
    ...filteredAttendanceFiles.slice(0, 2).map((file) => ({
      id: `attendance-${file.id}`,
      label: 'ملف بصمة',
      meta: file.employee?.fullName ?? file.branch?.name ?? 'ملف عام',
      amount: file.fileType.toUpperCase(),
      date: `${file.year}-${String(file.month).padStart(2, '0')}-01`,
    })),
  ]
    .sort((a, b) => normalizeDate(b.date).localeCompare(normalizeDate(a.date)))
    .slice(0, 5);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentMonthPayrollEmployeeIds = new Set(
    payrolls.data
      .filter((payroll) => payroll.payrollMonth === currentMonth && payroll.payrollYear === currentYear)
      .map((payroll) => payroll.employeeId),
  );
  const missingPayrollCount = employees.data.filter(
    (employee) => employee.isActive && !currentMonthPayrollEmployeeIds.has(employee.id),
  ).length;

  const alerts: DashboardAlert[] = [];

  if (overdueInvoices.length > 0) {
    alerts.push({
      id: 'overdue-invoices',
      title: 'فواتير مورد متأخرة',
      detail: `${overdueInvoices.length} فاتورة مفتوحة تجاوزت تاريخ الاستحقاق.`,
      tone: 'warning',
    });
  }

  if (Math.abs(drawerDifference) >= 50) {
    alerts.push({
      id: 'drawer-diff',
      title: 'فرق درج كبير',
      detail: `فرق الدرج الحالي يبلغ ${formatMoney(drawerDifference)}.`,
      tone: 'warning',
    });
  }

  const openDrawerSessionsCount = drawerSessions.data.filter((session) => session.status === 'open').length;
  if (openDrawerSessionsCount > 0) {
    alerts.push({
      id: 'open-drawer-sessions',
      title: 'جلسة درج غير مغلقة',
      detail: `${openDrawerSessionsCount} جلسة درج ما زالت مفتوحة.`,
    });
  }

  if (missingPayrollCount > 0) {
    alerts.push({
      id: 'missing-payroll',
      title: 'راتب غير مسجل',
      detail: `${missingPayrollCount} موظف نشط لا يملك راتبًا مسجلًا لهذا الشهر.`,
      tone: 'warning',
    });
  }

  const highVarianceCounts = filteredStockCounts.filter(
    (count) =>
      sumAbsolute(count.items.map((item) => Number(item.estimatedCostDifference ?? 0))) >= 200,
  );
  if (highVarianceCounts.length > 0) {
    alerts.push({
      id: 'stock-variance',
      title: 'فروقات جرد مرتفعة',
      detail: `${highVarianceCounts.length} عملية جرد تحتوي على فرق تكلفة مرتفع.`,
      tone: 'warning',
    });
  }

  const recentActivity: DashboardActivity[] = [
    ...filteredPurchaseInvoices.slice(0, 2).map((invoice) => ({
      id: `invoice-${invoice.id}`,
      label: 'فاتورة شراء',
      meta: invoice.supplier?.name ?? invoice.invoiceNumber,
      amount: formatMoney(invoice.totalAmount),
      date: invoice.invoiceDate,
    })),
    ...filteredSupplierPayments.slice(0, 2).map((payment) => ({
      id: `payment-${payment.id}`,
      label: 'دفعة مورد',
      meta: payment.purchaseInvoice?.invoiceNumber ?? payment.paymentNumber,
      amount: formatMoney(payment.amount),
      date: payment.paymentDate,
    })),
    ...filteredExpenses.slice(0, 2).map((expense) => ({
      id: `expense-${expense.id}`,
      label: 'مصروف',
      meta: expense.title ?? 'مصروف',
      amount: formatMoney(expense.amount),
      date: expense.expenseDate ?? '',
    })),
    ...filteredDailySales.slice(0, 2).map((sale) => ({
      id: `sale-${sale.id}`,
      label: 'مبيعات يومية',
      meta: sale.branchId,
      amount: formatMoney(sale.netSalesAmount),
      date: sale.salesDate,
    })),
    ...filteredDrawerTransactions.slice(0, 2).map((transaction) => ({
      id: `drawer-${transaction.id}`,
      label: 'حركة درج',
      meta: transaction.description,
      amount: formatMoney(transaction.amount),
      date: transaction.transactionDate,
    })),
    ...filteredBankTransactions.slice(0, 2).map((transaction) => ({
      id: `bank-${transaction.id}`,
      label: 'حركة بنك',
      meta: transaction.description,
      amount: formatMoney(transaction.amount),
      date: transaction.transactionDate,
    })),
    ...filteredTransfers.slice(0, 2).map((transfer) => ({
      id: `transfer-${transfer.id}`,
      label: 'تحويل فروع',
      meta: `${transfer.fromBranch.name} ← ${transfer.toBranch.name}`,
      amount: formatMoney(transfer.totalCostAmount),
      date: transfer.transferDate,
    })),
    ...filteredStockCounts.slice(0, 2).map((count) => ({
      id: `count-${count.id}`,
      label: 'جرد يدوي',
      meta: count.warehouse.name,
      amount: `${sumAbsolute(count.items.map((item) => Number(item.differenceQuantity ?? 0))).toFixed(3)}`,
      date: count.countDate,
    })),
  ]
    .sort((a, b) => normalizeDate(b.date).localeCompare(normalizeDate(a.date)))
    .slice(0, 10);

  const dashboardErrors = [
    branches.error,
    expenses.error,
    dailySales.error,
    drawerSessions.error,
    drawerTransactions.error,
    bankAccounts.error,
    bankTransactions.error,
    purchaseInvoices.error,
    supplierPayments.error,
    items.error,
    transfers.error,
    stockCounts.error,
    employees.error,
    advances.error,
    penalties.error,
    payrolls.error,
    attendanceFiles.error,
  ].filter(Boolean) as string[];

  return (
    <div className="dashboard-stack">
      <section className="dashboard-control-bar">
        <div className="dashboard-control-copy">
          <p className="eyebrow">{roleView.title}</p>
          <h2>لوحة تشغيل يومية واضحة وسريعة</h2>
          <p>{roleView.note}</p>
        </div>

        <form action="" className="dashboard-toolbar-filters">
          <label>
            الفرع
            <select defaultValue={branchId ?? ''} name="branch_id">
              <option value="">كل الفروع</option>
              {branches.data.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            من تاريخ
            <input defaultValue={dateFrom ?? ''} name="date_from" type="date" />
          </label>
          <label>
            إلى تاريخ
            <input defaultValue={dateTo ?? ''} name="date_to" type="date" />
          </label>
          <button type="submit">تحديث العرض</button>
        </form>

        <div className="dashboard-quick-actions">
          {quickActions.map((action) => (
            <Link className="dashboard-action-button" href={action.href} key={action.href}>
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      {dashboardErrors.length > 0 ? (
        <p className="notice">بعض البيانات غير متاحة حاليًا، لذلك تظهر بعض الأقسام بوضع تقديري أو فارغ.</p>
      ) : null}

      <section className="dashboard-kpis" aria-label="مؤشرات رئيسية">
        {[
          { label: 'إجمالي المبيعات', value: formatMoney(grossSales), note: 'إجمالي المبيعات قبل المرتجعات' },
          { label: 'المبيعات النقدية', value: formatMoney(cashSales), note: 'من سجل المبيعات اليومية' },
          { label: 'المبيعات غير النقدية', value: formatMoney(nonCashSales), note: 'بنك وتوصيل وموقع' },
          { label: 'إجمالي المصاريف', value: formatMoney(totalExpenses), note: 'ضمن الفترة المحددة' },
          { label: 'صافي اليوم', value: formatMoney(netDay), note: 'صافي المبيعات بعد المصاريف' },
          { label: 'الإكراميات', value: formatMoney(tipsAmount), note: 'من المبيعات اليومية' },
          { label: 'المرتجعات', value: formatMoney(returnsAmount), note: 'مرتجعات المبيعات المسجلة' },
        ].map((card) => (
          <article className="dashboard-kpi-card" key={card.label}>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
            <span>{card.note}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid dashboard-grid-primary">
        <article className="panel dashboard-panel">
          <div className="panel-heading">
            <h3>ملخص الدرج</h3>
            <span>{referenceDrawerSession?.drawer?.name ?? 'آخر جلسة متاحة'}</span>
          </div>
          <div className="dashboard-mini-grid">
            {[
              ['الرصيد الافتتاحي', formatMoney(drawerOpeningBalance)],
              ['المقبوض النقدي', formatMoney(drawerCashIn)],
              ['المدفوع النقدي', formatMoney(drawerCashOut)],
              ['الرصيد المحسوب', formatMoney(drawerCalculatedBalance)],
              ['الرصيد الختامي', formatMoney(drawerClosingBalance)],
              ['الفرق', formatMoney(drawerDifference)],
            ].map(([label, value]) => (
              <div className="mini-stat-card" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="quick-actions">
            <Link className="quick-link-button" href="/drawer-daily-sessions/new">
              فتح جلسة درج
            </Link>
            <Link className="quick-link-button" href="/drawer-daily-sessions">
              جلسات الدرج
            </Link>
            <Link className="quick-link-button" href="/drawer-transactions">
              حركات الدرج
            </Link>
          </div>
        </article>

        <article className="panel dashboard-panel">
          <div className="panel-heading">
            <h3>ملخص البنك</h3>
            <span>نظرة سريعة على الأرصدة والحركات</span>
          </div>
          <div className="dashboard-mini-grid">
            {[
              ['إجمالي الأرصدة البنكية', formatMoney(totalBankBalance)],
              ['الإيداعات', formatMoney(totalDeposits)],
              ['السحوبات', formatMoney(totalWithdrawals)],
              ['التحويلات', formatMoney(totalTransfers)],
            ].map(([label, value]) => (
              <div className="mini-stat-card" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="stacked-sections compact-form">
            <div className="dashboard-list-header">
              <strong>التسويات الأخيرة</strong>
              <span>{recentSettlements.length} عناصر</span>
            </div>
            {recentSettlements.length > 0 ? (
              <div className="dashboard-list">
                {recentSettlements.map((transaction) => (
                  <div className="dashboard-list-item" key={transaction.id}>
                    <div>
                      <strong>{transaction.description}</strong>
                      <span>{formatDate(transaction.transactionDate)}</span>
                    </div>
                    <b>{formatMoney(transaction.amount)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-inline">لا توجد تسويات حديثة ضمن الفترة الحالية.</div>
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel dashboard-panel">
          <div className="panel-heading">
            <h3>المشتريات والموردون</h3>
            <span>فواتير مفتوحة ودفعات حديثة</span>
          </div>
          <div className="dashboard-mini-grid">
            {[
              ['عدد فواتير الشراء المفتوحة', String(openInvoices.length)],
              ['إجمالي المستحق للموردين', formatMoney(totalSupplierDue)],
              ['الفواتير المتأخرة', String(overdueInvoices.length)],
              ['آخر دفعات الموردين', String(latestSupplierPayments.length)],
            ].map(([label, value]) => (
              <div className="mini-stat-card" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="dashboard-list-card">
            <div className="dashboard-list-header">
              <strong>فواتير الموردين المفتوحة</strong>
              <Link className="text-link" href="/purchase-invoices">
                عرض الكل
              </Link>
            </div>
            {recentOpenInvoices.length > 0 ? (
              <div className="dashboard-table-list">
                {recentOpenInvoices.map((invoice) => (
                  <div className="dashboard-table-row" key={invoice.id}>
                    <div>
                      <strong>{invoice.invoiceNumber}</strong>
                      <span>{invoice.supplier?.name ?? 'بدون مورد'}</span>
                    </div>
                    <div>
                      <strong>{formatMoney(invoice.remainingAmount)}</strong>
                      <span>{invoice.dueDate ? `استحقاق ${formatDate(invoice.dueDate)}` : 'بدون استحقاق'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-inline">لا توجد فواتير شراء مفتوحة حاليًا.</div>
            )}
          </div>
        </article>

        <article className="panel dashboard-panel">
          <div className="panel-heading">
            <h3>المخزون</h3>
            <span>مواد وتحويلات وجرد</span>
          </div>
          <div className="dashboard-mini-grid">
            {[
              ['عدد المواد', String(items.data.length)],
              ['عدد التحويلات بين الفروع', String(transferCount)],
              ['عدد عمليات الجرد', String(stockCountCount)],
              ['إجمالي فرق الجرد', totalStockDifference.toFixed(3)],
            ].map(([label, value]) => (
              <div className="mini-stat-card" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="dashboard-list-card">
            <div className="dashboard-list-header">
              <strong>{inventoryTableMode === 'transfers' ? 'أحدث التحويلات' : 'أحدث عمليات الجرد'}</strong>
              <span>{inventoryTableMode === 'transfers' ? 'تحويلات' : 'جرد'}</span>
            </div>
            {inventoryTableMode === 'transfers' ? (
              latestTransfers.length > 0 ? (
                <div className="dashboard-table-list">
                  {latestTransfers.map((transfer) => (
                    <div className="dashboard-table-row" key={transfer.id}>
                      <div>
                        <strong>{transfer.transferNumber}</strong>
                        <span>{transfer.fromBranch.name} ← {transfer.toBranch.name}</span>
                      </div>
                      <div>
                        <strong>{formatMoney(transfer.totalCostAmount)}</strong>
                        <span>{formatDate(transfer.transferDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-inline">لا توجد تحويلات حديثة.</div>
              )
            ) : latestStockCounts.length > 0 ? (
              <div className="dashboard-table-list">
                {latestStockCounts.map((count) => (
                  <div className="dashboard-table-row" key={count.id}>
                    <div>
                      <strong>{count.countNumber}</strong>
                      <span>{count.warehouse.name}</span>
                    </div>
                    <div>
                      <strong>
                        {sumAbsolute(count.items.map((item) => Number(item.differenceQuantity ?? 0))).toFixed(3)}
                      </strong>
                      <span>{formatDate(count.countDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-inline">لا توجد عمليات جرد حديثة.</div>
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel dashboard-panel">
          <div className="panel-heading">
            <h3>الموظفون والرواتب</h3>
            <span>سلف وعقوبات ونشاط حديث</span>
          </div>
          <div className="dashboard-mini-grid">
            {[
              ['عدد الموظفين', String(employeeCount)],
              ['إجمالي السلف', formatMoney(totalAdvances)],
              ['إجمالي العقوبات', formatMoney(totalPenalties)],
              ['إجمالي الرواتب', formatMoney(totalPayrolls)],
            ].map(([label, value]) => (
              <div className="mini-stat-card" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="dashboard-list-card">
            <div className="dashboard-list-header">
              <strong>نشاط الرواتب وملفات البصمة</strong>
              <span>{recentEmployeeActivity.length} عناصر</span>
            </div>
            {recentEmployeeActivity.length > 0 ? (
              <div className="dashboard-list">
                {recentEmployeeActivity.map((activity) => (
                  <div className="dashboard-list-item" key={activity.id}>
                    <div>
                      <strong>{activity.label}</strong>
                      <span>{activity.meta}</span>
                    </div>
                    <div className="dashboard-activity-side">
                      <b>{activity.amount ?? '—'}</b>
                      <span>{formatDate(activity.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-inline">لا توجد حركة حديثة للرواتب أو ملفات البصمة.</div>
            )}
          </div>
        </article>

        <article className="panel dashboard-panel">
          <div className="panel-heading">
            <h3>التنبيهات</h3>
            <span>تنبيهات تشغيلية مهمة</span>
          </div>
          {alerts.length > 0 ? (
            <div className="dashboard-alerts">
              {alerts.map((alert) => (
                <article className={`dashboard-alert-card ${alert.tone === 'warning' ? 'warning' : ''}`} key={alert.id}>
                  <strong>{alert.title}</strong>
                  <span>{alert.detail}</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-inline">لا توجد تنبيهات مهمة في الوقت الحالي.</div>
          )}
        </article>
      </section>

      <section className="panel dashboard-panel">
        <div className="panel-heading">
          <h3>آخر النشاطات</h3>
          <span>نظرة سريعة عبر النظام</span>
        </div>
        {recentActivity.length > 0 ? (
          <div className="dashboard-activity-grid">
            {recentActivity.map((activity) => (
              <div className="dashboard-activity-card" key={activity.id}>
                <p>{activity.label}</p>
                <strong>{activity.meta}</strong>
                <span>{activity.amount ?? '—'}</span>
                <small>{formatDate(activity.date)}</small>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-inline">لا توجد نشاطات حديثة ضمن التصفية الحالية.</div>
        )}
      </section>
    </div>
  );
}
