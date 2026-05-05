import { PageHeader } from '../../../../components/page-header';
import { UnitForm } from '../../../../components/unit-form';
import { fetchOne } from '../../../../lib/api';
import type { UnitOption } from '../../../../lib/types';

type UnitDetails = UnitOption & {
  notes?: string | null;
};

export default async function EditUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await fetchOne<UnitDetails>(`/units/${id}`);

  return (
    <>
      <PageHeader title="تعديل وحدة قياس" description="حدّث كود الوحدة أو اسمها أو حالتها." />
      {result.error ? <p className="notice">{result.error}</p> : null}
      {result.data ? <UnitForm initialUnit={result.data} /> : null}
    </>
  );
}
