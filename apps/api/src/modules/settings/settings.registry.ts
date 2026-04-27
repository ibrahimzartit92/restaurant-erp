import type { SettingValue } from './entities/setting.entity';

export type SettingFieldType = 'text' | 'textarea' | 'email' | 'url' | 'color' | 'number' | 'boolean' | 'select';

export type SettingFieldDefinition = {
  key: string;
  label: string;
  type: SettingFieldType;
  defaultValue: SettingValue;
  note?: string;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
};

export type SettingGroupDefinition = {
  key: string;
  title: string;
  description: string;
  fields: SettingFieldDefinition[];
};

export const settingsRegistry: SettingGroupDefinition[] = [
  {
    key: 'general',
    title: 'الإعدادات العامة',
    description: 'هوية النظام ومعلومات الشركة الأساسية التي تظهر في الواجهة والتقارير.',
    fields: [
      { key: 'appName', label: 'اسم البرنامج', type: 'text', defaultValue: 'Restaurant ERP' },
      { key: 'systemDescription', label: 'وصف النظام', type: 'textarea', defaultValue: 'نظام إدارة مطاعم متكامل' },
      { key: 'companyName', label: 'اسم الشركة', type: 'text', defaultValue: '' },
      { key: 'phone', label: 'الهاتف', type: 'text', defaultValue: '' },
      { key: 'email', label: 'البريد الإلكتروني', type: 'email', defaultValue: '' },
      { key: 'address', label: 'العنوان', type: 'textarea', defaultValue: '' },
      { key: 'logoUrl', label: 'اللوغو', type: 'url', defaultValue: '', note: 'ضع رابط صورة اللوغو أو مسارها داخل النظام.' },
    ],
  },
  {
    key: 'appearance',
    title: 'المظهر والهوية البصرية',
    description: 'تحكم بالألوان والخطوط والثيم الافتراضي لتوحيد تجربة المستخدم.',
    fields: [
      { key: 'primaryColor', label: 'اللون الرئيسي', type: 'color', defaultValue: '#14746f' },
      { key: 'secondaryColor', label: 'اللون الثانوي', type: 'color', defaultValue: '#2f6f9f' },
      { key: 'sidebarColor', label: 'لون الشريط الجانبي', type: 'color', defaultValue: '#ffffff' },
      { key: 'buttonColor', label: 'لون الأزرار', type: 'color', defaultValue: '#14746f' },
      {
        key: 'fontFamily',
        label: 'الخط',
        type: 'select',
        defaultValue: 'noto',
        options: [
          { label: 'Noto Sans Arabic', value: 'noto' },
          { label: 'Segoe UI', value: 'segoe' },
          { label: 'Tahoma', value: 'tahoma' },
        ],
      },
      { key: 'baseFontSize', label: 'حجم الخط الأساسي', type: 'number', defaultValue: 16, min: 12, max: 22 },
      {
        key: 'availableThemes',
        label: 'أكثر من ثيم جاهز',
        type: 'select',
        defaultValue: 'classic',
        note: 'اختر مجموعة الثيمات المتاحة للمسؤولين في الواجهة.',
        options: [
          { label: 'كلاسيكي', value: 'classic' },
          { label: 'هادئ', value: 'soft' },
          { label: 'مكثف', value: 'dense' },
        ],
      },
      {
        key: 'defaultTheme',
        label: 'الثيم الافتراضي',
        type: 'select',
        defaultValue: 'classic',
        options: [
          { label: 'كلاسيكي', value: 'classic' },
          { label: 'هادئ', value: 'soft' },
          { label: 'مكثف', value: 'dense' },
        ],
      },
    ],
  },
  {
    key: 'finance',
    title: 'الإعدادات المالية',
    description: 'سياسات العملة والترقيم وقواعد اعتماد المستندات المالية.',
    fields: [
      { key: 'baseCurrency', label: 'العملة الأساسية', type: 'text', defaultValue: 'ريال سعودي' },
      { key: 'currencySymbol', label: 'رمز العملة', type: 'text', defaultValue: 'ر.س' },
      { key: 'decimalPlaces', label: 'عدد المنازل العشرية', type: 'number', defaultValue: 2, min: 0, max: 4 },
      {
        key: 'invoiceNumberingMethod',
        label: 'طريقة ترقيم الفواتير',
        type: 'select',
        defaultValue: 'prefix-sequence',
        options: [
          { label: 'بادئة + رقم تسلسلي', value: 'prefix-sequence' },
          { label: 'سنة + بادئة + رقم', value: 'year-prefix-sequence' },
        ],
      },
      { key: 'invoicePrefix', label: 'prefix للفواتير', type: 'text', defaultValue: 'INV' },
      { key: 'paymentPrefix', label: 'prefix للدفعات', type: 'text', defaultValue: 'PAY' },
      { key: 'transferPrefix', label: 'prefix للتحويلات', type: 'text', defaultValue: 'TRN' },
      { key: 'stockCountPrefix', label: 'prefix للجرد', type: 'text', defaultValue: 'STK' },
      { key: 'payrollPrefix', label: 'prefix للرواتب', type: 'text', defaultValue: 'SAL' },
      { key: 'annualNumbering', label: 'هل الترقيم سنوي أو تراكمي', type: 'boolean', defaultValue: true, note: 'عند التفعيل يبدأ التسلسل من جديد مع كل سنة مالية.' },
      { key: 'allowInvoiceEditAfterApproval', label: 'هل يسمح بتعديل الفاتورة بعد الاعتماد', type: 'boolean', defaultValue: false },
      { key: 'archiveInsteadOfDelete', label: 'هل يسمح بالحذف أم الأرشفة فقط', type: 'boolean', defaultValue: true, note: 'يفضل تفعيل الأرشفة للحفاظ على الأثر المحاسبي.' },
    ],
  },
  {
    key: 'cashBank',
    title: 'إعدادات الدرج والبنك',
    description: 'ضوابط جلسات الدرج والحركات النقدية والمرجع البنكي.',
    fields: [
      { key: 'openingBalanceRequired', label: 'هل الرصيد الافتتاحي للدرج إجباري', type: 'boolean', defaultValue: true },
      { key: 'drawerClosingRequired', label: 'هل إغلاق جلسة الدرج إجباري', type: 'boolean', defaultValue: true },
      { key: 'allowDrawerMovementsWithoutSession', label: 'هل يسمح بحركات درج بدون جلسة', type: 'boolean', defaultValue: false },
      { key: 'drawerDifferenceAlertLimit', label: 'حد التنبيه على فرق الدرج', type: 'number', defaultValue: 25, min: 0 },
      { key: 'bankReferenceRequired', label: 'هل المرجع البنكي إجباري', type: 'boolean', defaultValue: true },
    ],
  },
  {
    key: 'inventory',
    title: 'إعدادات المخزون',
    description: 'طريقة التعامل مع الجرد والتحويلات وعرض كميات وتكاليف المخزون.',
    fields: [
      {
        key: 'stockCountMode',
        label: 'هل الجرد للمقارنة فقط أم للتعديل لاحقًا',
        type: 'select',
        defaultValue: 'compare',
        options: [
          { label: 'للمقارنة فقط', value: 'compare' },
          { label: 'يسمح بالتعديل لاحقًا', value: 'adjustable' },
        ],
      },
      { key: 'autoApplyBranchTransfers', label: 'هل التحويل بين الفروع يخصم ويضيف تلقائيًا', type: 'boolean', defaultValue: true },
      { key: 'showCostToUsers', label: 'هل التكلفة تظهر للمستخدمين', type: 'boolean', defaultValue: false },
      { key: 'showCurrentQuantity', label: 'هل تعرض الكمية الحالية', type: 'boolean', defaultValue: true },
      { key: 'showIncomingQuantity', label: 'هل تعرض الكمية الواردة', type: 'boolean', defaultValue: true },
      { key: 'showTransferredQuantity', label: 'هل تعرض الكمية المحولة', type: 'boolean', defaultValue: true },
    ],
  },
  {
    key: 'employeesPayroll',
    title: 'إعدادات الموظفين والرواتب',
    description: 'قواعد أرقام الموظفين والرواتب وملفات البصمة.',
    fields: [
      { key: 'employeeNumberFormat', label: 'صيغة رقم الموظف', type: 'text', defaultValue: 'EMP-{0000}', note: 'مثال: EMP-0001 أو BR-{branch}-{0000}.' },
      { key: 'defaultBranchRequired', label: 'هل الفرع الافتراضي مطلوب', type: 'boolean', defaultValue: true },
      { key: 'autoIncludeAdvancesPenalties', label: 'هل السلف والعقوبات تظهر تلقائيًا في شاشة الراتب', type: 'boolean', defaultValue: true },
      { key: 'preventDuplicateMonthlyPayroll', label: 'منع تكرار راتب لنفس الشهر', type: 'boolean', defaultValue: true },
      { key: 'attendanceAllowedFileTypes', label: 'أنواع الملفات المسموح رفعها للبصمة', type: 'text', defaultValue: 'csv,xlsx', note: 'اكتب الامتدادات مفصولة بفواصل.' },
      { key: 'attendanceMaxFileSizeMb', label: 'الحد الأقصى لحجم الملف', type: 'number', defaultValue: 10, min: 1, max: 100 },
    ],
  },
  {
    key: 'access',
    title: 'إعدادات الصلاحيات والوصول',
    description: 'تحكم في مستوى تطبيق الصلاحيات داخل القوائم والإجراءات.',
    fields: [
      { key: 'settingsAdminOnly', label: 'هل الإعدادات محصورة بالأدمن', type: 'boolean', defaultValue: true },
      { key: 'hideMenuItemsByPermissions', label: 'هل إخفاء عناصر القائمة حسب الصلاحيات مفعل', type: 'boolean', defaultValue: true },
      { key: 'restrictActionsByPermissions', label: 'هل الأزرار والإجراءات تتقيد بالصلاحيات', type: 'boolean', defaultValue: true },
    ],
  },
  {
    key: 'notifications',
    title: 'إعدادات التنبيهات',
    description: 'مصادر التنبيه التي تظهر للمستخدمين داخل النظام.',
    fields: [
      { key: 'inAppNotificationsEnabled', label: 'تفعيل التنبيهات داخل النظام', type: 'boolean', defaultValue: true },
      { key: 'supplierInvoiceOverdueAlert', label: 'تنبيه فواتير الموردين المتأخرة', type: 'boolean', defaultValue: true },
      { key: 'drawerDifferenceAlert', label: 'تنبيه فرق الدرج', type: 'boolean', defaultValue: true },
      { key: 'stockCountAlert', label: 'تنبيه الجرد', type: 'boolean', defaultValue: true },
      { key: 'missingPayrollAlert', label: 'تنبيه الرواتب غير المسجلة', type: 'boolean', defaultValue: true },
      { key: 'dueAlertDaysBefore', label: 'عدد الأيام قبل تنبيه الاستحقاق', type: 'number', defaultValue: 3, min: 0, max: 60 },
    ],
  },
  {
    key: 'exportPrint',
    title: 'إعدادات التصدير والطباعة',
    description: 'خيارات PDF وExcel وتنسيقات التاريخ والوقت في المخرجات.',
    fields: [
      { key: 'pdfCompanyName', label: 'اسم الشركة في PDF', type: 'text', defaultValue: '' },
      { key: 'showLogoInPrint', label: 'ظهور اللوغو', type: 'boolean', defaultValue: true },
      { key: 'printFooter', label: 'تذييل الطباعة', type: 'textarea', defaultValue: 'شكراً لاستخدامكم نظامنا' },
      {
        key: 'dateFormat',
        label: 'صيغة التاريخ',
        type: 'select',
        defaultValue: 'yyyy-MM-dd',
        options: [
          { label: '2026-04-27', value: 'yyyy-MM-dd' },
          { label: '27/04/2026', value: 'dd/MM/yyyy' },
          { label: '27 أبريل 2026', value: 'arabic-long' },
        ],
      },
      {
        key: 'timeFormat',
        label: 'صيغة الوقت',
        type: 'select',
        defaultValue: '24h',
        options: [
          { label: '24 ساعة', value: '24h' },
          { label: '12 ساعة', value: '12h' },
        ],
      },
      { key: 'pdfEnabled', label: 'تفعيل PDF', type: 'boolean', defaultValue: true },
      { key: 'excelEnabled', label: 'تفعيل Excel', type: 'boolean', defaultValue: true },
    ],
  },
  {
    key: 'maintenance',
    title: 'النسخ الاحتياطي والصيانة',
    description: 'متابعة حالة النسخ الاحتياطي وإطلاق نسخة يدوية عند الحاجة.',
    fields: [
      {
        key: 'backupType',
        label: 'نوع النسخة',
        type: 'select',
        defaultValue: 'manual',
        options: [
          { label: 'يدوية', value: 'manual' },
          { label: 'مجدولة', value: 'scheduled' },
          { label: 'كاملة', value: 'full' },
        ],
      },
      { key: 'lastBackupStatus', label: 'حالة آخر نسخة', type: 'text', defaultValue: 'لا توجد نسخة بعد' },
      { key: 'lastBackupAt', label: 'وقت آخر نسخة', type: 'text', defaultValue: 'غير محدد' },
    ],
  },
];

export function flattenSettingsRegistry() {
  return settingsRegistry.flatMap((group, groupIndex) =>
    group.fields.map((field, fieldIndex) => ({
      group,
      field,
      sortOrder: groupIndex * 100 + fieldIndex,
    })),
  );
}
