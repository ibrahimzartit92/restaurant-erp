export function BackendFallbackNote({
  message = 'يتم عرض واجهة جاهزة الآن، وعند اكتمال الربط الخلفي ستظهر البيانات الحقيقية هنا تلقائياً.',
}: Readonly<{
  message?: string;
}>) {
  return <p className="notice">وضع تجريبي: {message}</p>;
}
