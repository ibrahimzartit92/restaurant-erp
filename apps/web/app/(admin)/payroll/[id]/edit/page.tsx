import { redirect } from 'next/navigation';

export default async function LegacyEditPayrollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  redirect(`/payrolls/${id}/edit`);
}
