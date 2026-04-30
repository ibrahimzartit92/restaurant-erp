import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataTable, type DataColumn } from '../../../components/data-table';
import { PageHeader } from '../../../components/page-header';
import { StatusBadge } from '../../../components/status-badge';
import { fetchList, fetchOne, formatDate, getMoneyFormatter } from '../../../lib/api';
import type {
  AttendanceFileSummary,
  EmployeeAdvanceSummary,
  EmployeePenaltySummary,
  EmployeeSummary,
  PayrollSummary,
} from '../../../lib/types';

const payrollStatusLabel: Record<string, string> = {
  unpaid: 'غير مدفوع',
  partially_paid: 'مدفوع جزئيا',
  paid: 'مدفوع',
};

function linkedPayrollText(row: { payrollRecordId?: string | null; payrollMonth?: number | null; payrollYear?: number | null }) {
  const period = row.payrollMonth && row.payrollYear ? `${row.payrollMonth}/${row.payrollYear}` : 'غير مرتبط بفترة';
  return row.payrollRecordId ? `${period} - محتسب في راتب` : period;
}

export default async function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [employeeResult, advancesResult, penaltiesResult, payrollResult, attendanceResult, formatMoney] = await Promise.all([
    fetchOne<EmployeeSummary>(`/employees/${id}`),
    fetchList<EmployeeAdvanceSummary>(`/employee-advances?employee_id=${id}`),
    fetchList<EmployeePenaltySummary>(`/employee-penalties?employee_id=${id}`),
    fetchList<PayrollSummary>(`/payrolls?employee_id=${id}`),
    fetchList<AttendanceFileSummary>(`/attendance-files?employee_id=${id}`),
    getMoneyFormatter(),
  ]);

  if (!employeeResult.data) {
    notFound();
  }

  const employee = employeeResult.data;
  const advances = advancesResult.data;
  const penalties = penaltiesResult.data;
  const payrolls = [...payrollResult.data].sort(
    (first, second) => second.payrollYear - first.payrollYear || second.payrollMonth - first.payrollMonth,
  );
  const latestPayroll = payrolls[0] ?? null;
  const totalAdvances = advances.reduce((sum, advance) => sum + Number(advance.amount ?? 0), 0);
  const totalPenalties = penalties.reduce((sum, penalty) => sum + Number(penalty.amount ?? 0), 0);
  const unpaidPayroll = payrolls.reduce((sum, payroll) => sum + Number(payroll.remainingAmount ?? 0), 0);
  const employeeQuery = `employee_id=${encodeURIComponent(employee.id)}`;

  const advancesColumns: DataColumn<EmployeeAdvanceSummary>[] = [
    { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.advanceDate) },
    { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
    { key: 'period', label: 'فترة الراتب', render: linkedPayrollText },
    { key: 'notes', label: 'ملاحظات', render: (row) => row.notes ?? 'بدون ملاحظات' },
  ];

  const penaltiesColumns: DataColumn<EmployeePenaltySummary>[] = [
    { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.penaltyDate) },
    { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
    { key: 'reason', label: 'السبب', render: (row) => row.reason ?? 'بدون سبب' },
    { key: 'period', label: 'فترة الراتب', render: linkedPayrollText },
  ];

  const payrollColumns: DataColumn<PayrollSummary>[] = [
    {
      key: 'period',
      label: 'الشهر/السنة',
      render: (row) => (
        <Link className="text-link" href={`/payrolls/${row.id}/edit`}>
          {row.payrollMonth}/{row.payrollYear}
        </Link>
      ),
    },
    { key: 'net', label: 'صافي الراتب', render: (row) => formatMoney(row.netSalary) },
    { key: 'paid', label: 'المدفوع', render: (row) => formatMoney(row.paidAmount ?? 0) },
    { key: 'remaining', label: 'المتبقي', render: (row) => formatMoney(row.remainingAmount ?? 0) },
    {
      key: 'status',
      label: 'الحالة',
      render: (row) => payrollStatusLabel[row.paymentStatus ?? 'unpaid'] ?? row.paymentStatus ?? 'غير مدفوع',
    },
  ];

  const attendanceColumns: DataColumn<AttendanceFileSummary>[] = [
    { key: 'period', label: 'الشهر/السنة', render: (row) => `${row.month}/${row.year}` },
    { key: 'fileName', label: 'اسم الملف', render: (row) => row.fileName },
    { key: 'fileType', label: 'النوع', render: (row) => row.fileType },
    { key: 'notes', label: 'ملاحظات', render: (row) => row.notes ?? 'بدون ملاحظات' },
  ];

  return (
    <>
      <PageHeader
        title={employee.fullName}
        description="ملف موظف كامل يجمع البيانات الأساسية، السلف، العقوبات، الرواتب، وملفات الحضور."
      />

      <section className="summary-grid">
        <div className="summary-card">
          <p>إجمالي السلف</p>
          <strong>{formatMoney(totalAdvances)}</strong>
          <span>{advances.length} سجل</span>
        </div>
        <div className="summary-card">
          <p>إجمالي العقوبات</p>
          <strong>{formatMoney(totalPenalties)}</strong>
          <span>{penalties.length} سجل</span>
        </div>
        <div className="summary-card">
          <p>آخر راتب</p>
          <strong>{latestPayroll ? `${latestPayroll.payrollMonth}/${latestPayroll.payrollYear}` : 'لا يوجد'}</strong>
          <span>{latestPayroll ? formatMoney(latestPayroll.netSalary) : 'لم يسجل راتب بعد'}</span>
        </div>
        <div className="summary-card">
          <p>رواتب غير مدفوعة</p>
          <strong>{formatMoney(unpaidPayroll)}</strong>
          <span>المتبقي من سجلات الرواتب</span>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <h3>البيانات الأساسية</h3>
            <StatusBadge value={employee.isActive} />
          </div>
          <ul className="timeline-list">
            <li>رقم الموظف: {employee.employeeNumber}</li>
            <li>الهاتف: {employee.phone ?? 'غير محدد'}</li>
            <li>المسمى الوظيفي: {employee.jobTitle ?? 'غير محدد'}</li>
            <li>الفرع الافتراضي: {employee.defaultBranch?.name ?? 'بدون فرع'}</li>
            <li>تاريخ التعيين: {employee.hireDate ? formatDate(employee.hireDate) : 'غير محدد'}</li>
            <li>ملاحظات: {employee.notes ?? 'بدون ملاحظات'}</li>
          </ul>
          <div className="form-actions">
            <Link className="primary-button" href={`/employees/${employee.id}/edit`}>
              تعديل الموظف
            </Link>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h3>إجراءات سريعة</h3>
            <span>مرتبطة بهذا الموظف</span>
          </div>
          <div className="quick-actions">
            <Link className="quick-link-button" href={`/employee-advances/new?${employeeQuery}`}>
              إضافة سلفة
            </Link>
            <Link className="quick-link-button" href={`/employee-penalties/new?${employeeQuery}`}>
              إضافة عقوبة
            </Link>
            <Link className="quick-link-button" href={`/payrolls/new?${employeeQuery}`}>
              إضافة راتب
            </Link>
            <Link className="quick-link-button" href={`/attendance-files/new?${employeeQuery}`}>
              رفع ملف حضور
            </Link>
          </div>
        </div>
      </section>

      <section className="stacked-sections">
        <div className="panel" id="advances">
          <div className="panel-heading">
            <h3>السلف</h3>
            <span>{advances.length} سجل</span>
          </div>
          <DataTable columns={advancesColumns} rows={advances} emptyTitle="لا توجد سلف" emptyText="عند تسجيل سلفة لهذا الموظف ستظهر هنا." />
        </div>

        <div className="panel" id="penalties">
          <div className="panel-heading">
            <h3>العقوبات</h3>
            <span>{penalties.length} سجل</span>
          </div>
          <DataTable columns={penaltiesColumns} rows={penalties} emptyTitle="لا توجد عقوبات" emptyText="عند تسجيل عقوبة لهذا الموظف ستظهر هنا." />
        </div>

        <div className="panel" id="payroll">
          <div className="panel-heading">
            <h3>الرواتب</h3>
            <span>{payrolls.length} سجل</span>
          </div>
          <DataTable columns={payrollColumns} rows={payrolls} emptyTitle="لا توجد رواتب" emptyText="عند تسجيل راتب لهذا الموظف سيظهر هنا." />
        </div>

        <div className="panel" id="attendance">
          <div className="panel-heading">
            <h3>ملفات الحضور</h3>
            <span>{attendanceResult.data.length} ملف</span>
          </div>
          <DataTable
            columns={attendanceColumns}
            rows={attendanceResult.data}
            emptyTitle="لا توجد ملفات حضور"
            emptyText="عند رفع ملف حضور لهذا الموظف سيظهر هنا."
          />
        </div>
      </section>
    </>
  );
}
