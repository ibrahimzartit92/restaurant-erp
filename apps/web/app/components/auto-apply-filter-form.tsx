'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, type SyntheticEvent, useRef, useTransition } from 'react';

type AutoApplyFilterFormProps = Readonly<{
  children: ReactNode;
  className?: string;
  debounceMs?: number;
}>;

export function AutoApplyFilterForm({ children, className, debounceMs = 450 }: AutoApplyFilterFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  function applyFilters() {
    const form = formRef.current;
    if (!form) return;

    const params = new URLSearchParams();
    const formData = new FormData(form);
    formData.forEach((value, key) => {
      const normalizedValue = String(value).trim();
      if (normalizedValue) params.set(key, normalizedValue);
    });

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      router.refresh();
    });
  }

  function scheduleApply(event: SyntheticEvent<HTMLFormElement>) {
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    if (!target?.name) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const isTextInput =
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLInputElement && ['search', 'text', 'email', 'tel', 'url'].includes(target.type));

    if (isTextInput) {
      debounceRef.current = setTimeout(applyFilters, debounceMs);
      return;
    }

    applyFilters();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    applyFilters();
  }

  return (
    <form ref={formRef} className={className} onChange={scheduleApply} onSubmit={handleSubmit}>
      {children}
    </form>
  );
}
