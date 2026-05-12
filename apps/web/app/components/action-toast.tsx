'use client';

export function ActionToast({
  message,
  tone,
}: Readonly<{
  message: string | null;
  tone: 'success' | 'danger';
}>) {
  if (!message) return null;
  return <p className={`notice ${tone}`}>{message}</p>;
}
