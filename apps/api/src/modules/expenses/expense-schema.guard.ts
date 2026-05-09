import { DataSource } from 'typeorm';

export async function tableExists(dataSource: DataSource, tableName: string) {
  const rows = await dataSource.query(
    `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = $1
      LIMIT 1
    `,
    [tableName],
  );

  return rows.length > 0;
}

export async function columnExists(dataSource: DataSource, tableName: string, columnName: string) {
  const rows = await dataSource.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `,
    [tableName, columnName],
  );

  return rows.length > 0;
}

export async function hasExpenseHierarchySchema(dataSource: DataSource) {
  const [typesTable, expenseTypeId, categoryActive, paidAmount, remainingAmount, paymentStatus] = await Promise.all([
    tableExists(dataSource, 'expense_types'),
    columnExists(dataSource, 'expenses', 'expense_type_id'),
    columnExists(dataSource, 'expense_categories', 'is_active'),
    columnExists(dataSource, 'expenses', 'paid_amount'),
    columnExists(dataSource, 'expenses', 'remaining_amount'),
    columnExists(dataSource, 'expenses', 'payment_status'),
  ]);

  return typesTable && expenseTypeId && categoryActive && paidAmount && remainingAmount && paymentStatus;
}
