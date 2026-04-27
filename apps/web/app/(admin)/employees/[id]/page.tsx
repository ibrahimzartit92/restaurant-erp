import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataTable, type DataColumn } from '../../../components/data-table';
import { PageHeader } from '../../../components/page-header';
import { fetchList, fetchOne, formatDate, formatMoney } from '../../../lib/api';
import type {
  AttendanceFileSummary,
  EmployeeAdvanceSummary,
  EmployeePenaltySummary,
  EmployeeSummary,
  PayrollSummary,
} from '../../../lib/types';

const advancesColumns: DataColumn<EmployeeAdvanceSummary>[] = [
  { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.advanceDate) },
  { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
  { key: 'period', label: 'فترة الراتب', render: (row) => row.payrollMonth && row.payrollYear ? `${row.payrollMonth}/${row.payrollYear}` : 'غير مرتبط' },
  { key: 'notes', label: 'ملاحظات', render: (row) => row.notes ?? 'بدون ملاحظات' },
];

const penaltiesColumns: DataColumn<EmployeePenaltySummary>[] = [
  { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.penaltyDate) },
  { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
  { key: 'reason', label: 'السبب', render: (row) => row.reason ?? 'بدون سبب' },
  { key: 'notes', label: 'ملاحظات', render: (row) => row.notes ?? 'بدون ملاحظات' },
];

const payrollColumns: DataColumn<PayrollSummary>[] = [
  { key: 'period', label: 'الشهر/السنة', render: (row) => `${row.payrollMonth}/${row.payrollYear}` },
  { key: 'baseSalary', label: 'الأساسي', render: (row) => formatMoney(row.baseSalary) },
  { key: 'allowances', label: 'البدلات', render: (row) => formatMoney(row.allowancesAmount) },
  { key: 'net', label: 'الصافي', render: (row) => formatMoney(row.netSalary) },
];

const attendanceColumns: DataColumn<AttendanceFileSummary>[] = [
  { key: 'period', label: 'الشهر/السنة', render: (row) => `${row.month}/${row.year}` },
  { key: 'fileName', label: 'اسم الملف', render: (row) => row.fileName },
  { key: 'fileType', label: 'النوع', render: (row) => row.fileType },
  { key: 'path', label: 'المسار', render: (row) => row.filePath },
];

export default async function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [employeeResult, advancesResult, penaltiesResult, payrollResult, attendanceResult] = await Promise.all([
    fetchOne<EmployeeSummary>(`/employees/${id}`),
    fetchList<EmployeeAdvanceSummary>(`/employee-advances${`?employee_id=${id}`}`),
    fetchList<EmployeePenaltySummary>(`/employee-penalties${`?employee_id=${id}`}`),
    fetchList<PayrollSummary>(`/payrolls${`?employee_id=${id}`}`),
    fetchList<AttendanceFileSummary>(`/attendance-files${`?employee_id=${id}`}`),
  ]);

  if (!employeeResult.data) {
    notFound();
  }

  const employee = employeeResult.data;

  return (
    <>
      <PageHeader title="صفحة تفاصيل موظف" description="عرض البيانات الأساسية والسلف والعقوبات والرواتب وملفات البصمة للموظف." />
      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <h3>البيانات الأساسية</h3>
            <span>{employee.employeeNumber}</span>
          </div>
          <ul className="timeline-list">
            <li>الاسم: {employee.fullName}</li>
            <li>الهاتف: {employee.phone ?? 'غير محدد'}</li>
            <li>المسمى الوظيفي: {employee.jobTitle ?? 'غير محدد'}</li>
            <li>الفرع الافتراضي: {employee.defaultBranch?.name ?? 'بدون فرع'}</li>
            <li>تاريخ التعيين: {employee.hireDate ? formatDate(employee.hireDate) : 'غير محدد'}</li>
            <li>الحالة: {employee.isActive ? 'نشط' : 'متوقف'}</li>
            <li>ملاحظات: {employee.notes ?? 'بدون ملاحظات'}</li>
          </ul>
          <div className="form-actions">
            <Link className="primary-button" href={`/employees/${employee.id}/edit`}>تعديل الموظف</Link>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h3>إجراءات سريعة</h3>
            <span>الموظف</span>
          </div>
          <div className="quick-actions">
            <Link className="quick-link-button" href="/employee-advances/new">إضافة سلفة</Link>
            <Link className="quick-link-button" href="/employee-penalties/new">إضافة عقوبة</Link>
            <Link className="quick-link-button" href="/payroll/new">إضافة راتب</Link>
            <Link className="quick-link-button" href="/attendance-files/new">رفع ملف بصمة</Link>
          </div>
        </div>
      </section>

      <section className="stacked-sections">
        <div className="panel">
          <div className="panel-heading"><h3>السلف</h3><span>{advancesResult.data.length}</span></div>
          <DataTable columns={advancesColumns} rows={advancesResult.data} emptyTitle="لا توجد سلف" emptyText="عند تسجيل سلفة لهذا الموظف ستظهر هنا." />
        </div>
        <div className="panel">
          <div className="panel-heading"><h3>العقوبات</h3><span>{penaltiesResult.data.length}</span></div>
          <DataTable columns={penaltiesColumns} rows={penaltiesResult.data} emptyTitle="لا توجد عقوبات" emptyText="عند تسجيل عقوبة لهذا الموظف ستظهر هنا." />
        </div>
        <div className="panel">
          <div className="panel-heading"><h3>الرواتب</h3><span>{payrollResult.data.length}</span></div>
          <DataTable columns={payrollColumns} rows={payrollResult.data} emptyTitle="لا توجد رواتب" emptyText="عند تسجيل راتب لهذا الموظف سيظهر هنا." />
        </div>
        <div className="panel">
          <div className="panel-heading"><h3>ملفات البصمة</h3><span>{attendanceResult.data.length}</span></div>
          <DataTable columns={attendanceColumns} rows={attendanceResult.data} emptyTitle="لا توجد ملفات بصمة" emptyText="عند رفع ملف بصمة لهذا الموظف سيظهر هنا." />
        </div>
      </section>
    </>
  );
}
