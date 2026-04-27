import { redirect } from 'next/navigation';

export default function LegacyNewPayrollPage() {
  redirect('/payrolls/new');
}
