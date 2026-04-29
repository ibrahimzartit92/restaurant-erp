import { redirect } from 'next/navigation';

export default function CloseDrawerSessionPage() {
  redirect('/drawers');
}
