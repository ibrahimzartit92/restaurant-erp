import { MigrationInterface, QueryRunner } from 'typeorm';

export class AccessControlManagement1730000005000 implements MigrationInterface {
  name = 'AccessControlManagement1730000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE roles RENAME COLUMN name TO code`);
    await queryRunner.query(`ALTER TABLE roles RENAME COLUMN description TO notes`);
    await queryRunner.query(`ALTER TABLE roles ALTER COLUMN notes TYPE text`);
    await queryRunner.query(`ALTER TABLE roles ADD COLUMN name varchar(120)`);
    await queryRunner.query(`
      UPDATE roles
      SET name = CASE code
        WHEN 'admin' THEN 'مدير النظام'
        WHEN 'accountant' THEN 'محاسب'
        WHEN 'branch_manager' THEN 'مدير فرع'
        ELSE code
      END
    `);
    await queryRunner.query(`ALTER TABLE roles ALTER COLUMN name SET NOT NULL`);

    await queryRunner.query(`ALTER TABLE users ADD COLUMN username varchar(80)`);
    await queryRunner.query(`UPDATE users SET username = LOWER(SPLIT_PART(email, '@', 1))`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN username SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE users ADD CONSTRAINT uq_users_username UNIQUE (username)`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN notes text`);

    await queryRunner.query(`
      CREATE TABLE permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(120) NOT NULL UNIQUE,
        name varchar(160) NOT NULL,
        module varchar(120) NOT NULL,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE role_permissions (
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      )
    `);

    await queryRunner.query(`
      INSERT INTO permissions (code, name, module, notes)
      VALUES
        ('view_users', 'عرض المستخدمين', 'users', 'عرض قائمة المستخدمين'),
        ('create_users', 'إضافة مستخدم', 'users', 'إنشاء مستخدم جديد'),
        ('edit_users', 'تعديل مستخدم', 'users', 'تعديل بيانات المستخدمين'),
        ('manage_roles', 'إدارة الأدوار', 'roles', 'إضافة وتعديل وربط الصلاحيات بالأدوار'),
        ('manage_permissions', 'إدارة الصلاحيات', 'permissions', 'إضافة وتعديل كتالوج الصلاحيات'),
        ('view_branches', 'عرض الفروع', 'branches', 'عرض بيانات الفروع'),
        ('create_branches', 'إضافة فرع', 'branches', 'إنشاء فرع جديد'),
        ('edit_branches', 'تعديل فرع', 'branches', 'تعديل بيانات الفروع'),
        ('view_warehouses', 'عرض المخازن', 'warehouses', 'عرض بيانات المخازن'),
        ('create_warehouses', 'إضافة مخزن', 'warehouses', 'إنشاء مخزن جديد'),
        ('edit_warehouses', 'تعديل مخزن', 'warehouses', 'تعديل بيانات المخازن'),
        ('view_bank_accounts', 'عرض الحسابات البنكية', 'bank_accounts', 'عرض الحسابات البنكية'),
        ('create_bank_accounts', 'إضافة حساب بنكي', 'bank_accounts', 'إنشاء حساب بنكي'),
        ('edit_bank_accounts', 'تعديل حساب بنكي', 'bank_accounts', 'تعديل الحسابات البنكية'),
        ('view_drawers', 'عرض الأدراج', 'drawers', 'عرض الأدراج النقدية'),
        ('create_drawers', 'إضافة درج', 'drawers', 'إنشاء درج نقدي'),
        ('edit_drawers', 'تعديل درج', 'drawers', 'تعديل الأدراج النقدية'),
        ('view_items', 'عرض المواد', 'items', 'عرض المواد والمخزون'),
        ('create_items', 'إضافة مادة', 'items', 'إنشاء مادة جديدة'),
        ('edit_items', 'تعديل مادة', 'items', 'تعديل المواد'),
        ('view_suppliers', 'عرض الموردين', 'suppliers', 'عرض الموردين'),
        ('create_suppliers', 'إضافة مورد', 'suppliers', 'إنشاء مورد جديد'),
        ('edit_suppliers', 'تعديل مورد', 'suppliers', 'تعديل الموردين'),
        ('view_purchase_invoices', 'عرض فواتير الشراء', 'purchase_invoices', 'عرض فواتير الشراء'),
        ('create_purchase_invoices', 'إضافة فاتورة شراء', 'purchase_invoices', 'إنشاء فاتورة شراء'),
        ('edit_purchase_invoices', 'تعديل فاتورة شراء', 'purchase_invoices', 'تعديل فواتير الشراء'),
        ('view_supplier_payments', 'عرض دفعات الموردين', 'supplier_payments', 'عرض دفعات الموردين'),
        ('create_supplier_payments', 'إضافة دفعة مورد', 'supplier_payments', 'إنشاء دفعة مورد'),
        ('edit_supplier_payments', 'تعديل دفعة مورد', 'supplier_payments', 'تعديل دفعات الموردين'),
        ('view_expenses', 'عرض المصاريف', 'expenses', 'عرض المصاريف'),
        ('create_expenses', 'إضافة مصروف', 'expenses', 'إنشاء مصروف جديد'),
        ('edit_expenses', 'تعديل مصروف', 'expenses', 'تعديل المصاريف'),
        ('view_daily_sales', 'عرض المبيعات اليومية', 'daily_sales', 'عرض المبيعات اليومية'),
        ('create_daily_sales', 'إضافة مبيعات يومية', 'daily_sales', 'إدخال مبيعات يومية'),
        ('edit_daily_sales', 'تعديل المبيعات اليومية', 'daily_sales', 'تعديل المبيعات اليومية'),
        ('view_reports', 'عرض التقارير', 'reports', 'عرض التقارير'),
        ('export_reports', 'تصدير التقارير', 'reports', 'تصدير التقارير والبيانات'),
        ('manage_settings', 'إدارة الإعدادات', 'settings', 'تعديل إعدادات النظام')
    `);

    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.code = 'admin'
    `);

    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      JOIN permissions p
        ON p.code NOT IN ('manage_roles', 'manage_permissions', 'view_users', 'create_users', 'edit_users')
      WHERE r.code = 'accountant'
    `);

    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      JOIN permissions p
        ON p.code IN (
          'view_items',
          'view_suppliers',
          'view_purchase_invoices',
          'create_purchase_invoices',
          'edit_purchase_invoices',
          'view_supplier_payments',
          'create_supplier_payments',
          'edit_supplier_payments',
          'view_expenses',
          'create_expenses',
          'edit_expenses',
          'view_daily_sales',
          'create_daily_sales',
          'edit_daily_sales',
          'view_drawers',
          'view_reports'
        )
      WHERE r.code = 'branch_manager'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE role_permissions`);
    await queryRunner.query(`DROP TABLE permissions`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN notes`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN email SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT uq_users_username`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN username`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN name`);
    await queryRunner.query(`ALTER TABLE roles ALTER COLUMN notes TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE roles RENAME COLUMN notes TO description`);
    await queryRunner.query(`ALTER TABLE roles RENAME COLUMN code TO name`);
  }
}
