import Link from 'next/link';
import { PageHeader } from '../../components/page-header';
import { fetchList } from '../../lib/api';
import type { ReportCatalogItem } from '../../lib/types';

const priorityReports = new Set(['daily-sales', 'expenses', 'purchases', 'supplier-statement', 'drawer']);

export default async function ReportsPage() {
  const result = await fetchList<ReportCatalogItem>('/reports');
  const reports = [...result.data].sort((first, second) => {
    const firstPriority = priorityReports.has(first.key) ? 0 : 1;
    const secondPriority = priorityReports.has(second.key) ? 0 : 1;

    return firstPriority - secondPriority;
  });

  return (
    <>
      <PageHeader
        title="مركز التقارير"
        description="تقارير تشغيلية يومية مع فلاتر وتصدير Excel ونسخة طباعة PDF مبسطة."
      />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <section className="report-grid">
        {reports.map((report) => (
          <Link className="report-card" href={`/reports/${report.key}`} key={report.key}>
            <span>{priorityReports.has(report.key) ? 'تقرير أساسي' : 'تقرير تشغيلي'}</span>
            <strong>{report.title}</strong>
            <p>{report.description}</p>
          </Link>
        ))}
      </section>
    </>
  );
}
