export enum ExpensePaymentMethod {
  Cash = 'cash',
  Bank = 'bank',
  Other = 'other',
}

export const numericTransformer = {
  to: (value?: number | null) => value ?? 0,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};
