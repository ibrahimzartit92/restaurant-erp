import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Repository } from 'typeorm';
import { GroupedSettingsPayload } from './dto/update-settings.dto';
import { SettingEntity, SettingValue } from './entities/setting.entity';
import { flattenSettingsRegistry, settingsRegistry, SettingFieldDefinition } from './settings.registry';

@Injectable()
export class SettingsService {
  private registrySyncPromise: Promise<void> | null = null;

  constructor(
    @InjectRepository(SettingEntity)
    private readonly settingsRepository: Repository<SettingEntity>,
  ) {}

  async findAll() {
    await this.ensureRegistryRows();
    const rows = await this.settingsRepository.find({ order: { sortOrder: 'ASC' } });

    return this.buildSettingsResponse(rows);
  }

  async update(updatePayload: GroupedSettingsPayload) {
    await this.ensureRegistryRows();

    const definitions = flattenSettingsRegistry();
    const definitionsByGroupAndKey = new Map(
      definitions.map((definition) => [`${definition.group.key}.${definition.field.key}`, definition]),
    );

    if (!updatePayload || typeof updatePayload !== 'object' || Array.isArray(updatePayload)) {
      throw new BadRequestException('بيانات الإعدادات غير صحيحة.');
    }

    await this.settingsRepository.manager.transaction(async (entityManager) => {
      const settingsRepository = entityManager.getRepository(SettingEntity);
      const rows = await settingsRepository.find();
      const rowsByGroupAndKey = new Map(rows.map((row) => [`${row.group}.${row.key}`, row]));
      const rowsToSave: SettingEntity[] = [];

      for (const [groupKey, groupValues] of Object.entries(updatePayload)) {
        if (!groupValues || typeof groupValues !== 'object' || Array.isArray(groupValues)) {
          throw new BadRequestException(`بيانات قسم الإعدادات غير صحيحة: ${groupKey}`);
        }

        for (const [fieldKey, rawValue] of Object.entries(groupValues)) {
          const definition = definitionsByGroupAndKey.get(`${groupKey}.${fieldKey}`);

          if (!definition) {
            throw new BadRequestException(`إعداد غير معروف: ${groupKey}.${fieldKey}`);
          }

          const value = this.normalizeValue(definition.field, rawValue);
          const existingRow = rowsByGroupAndKey.get(`${groupKey}.${fieldKey}`);
          const row =
            existingRow ??
            settingsRepository.create({
              group: definition.group.key,
              key: definition.field.key,
              label: definition.field.label,
              type: definition.field.type,
              note: definition.field.note ?? null,
              options: definition.field.options ?? null,
              sortOrder: definition.sortOrder,
            });

          row.value = value;
          rowsToSave.push(row);
        }
      }

      if (rowsToSave.length > 0) {
        await settingsRepository.save(rowsToSave);
      }
    });

    return this.findAll();
  }

  async createManualBackupSnapshot() {
    const now = new Date();
    const formattedDate = now.toISOString();
    const payload = await this.buildBackupPayload(formattedDate);
    const fileName = `restaurant-erp-backup-${formattedDate.replace(/[:.]/g, '-')}.json`;
    const backupDir = resolve(process.env.BACKUP_DIR ?? join(process.cwd(), 'backups'));
    const filePath = join(backupDir, fileName);
    const serializedPayload = JSON.stringify(payload, null, 2);

    await this.ensureMaintenanceBackupsTable();
    await mkdir(backupDir, { recursive: true });
    await writeFile(filePath, serializedPayload, 'utf8');

    const [backup] = await this.settingsRepository.query(
      `
        INSERT INTO maintenance_backups (file_name, file_path, file_size, status, backup_type, payload)
        VALUES ($1, $2, $3, 'success', 'manual', $4::jsonb)
        RETURNING id, file_size AS "fileSize"
      `,
      [fileName, filePath, Buffer.byteLength(serializedPayload, 'utf8'), JSON.stringify(payload)],
    );

    await this.update({
      maintenance: {
        backupType: 'manual',
        lastBackupStatus: 'تم إنشاء نسخة يدوية بنجاح',
        lastBackupAt: formattedDate,
      },
    });

    return {
      id: backup.id,
      status: 'success',
      backupType: 'manual',
      fileName,
      fileSize: backup.fileSize,
      lastBackupStatus: 'تم إنشاء نسخة يدوية بنجاح',
      lastBackupAt: formattedDate,
    };
  }

  async listBackups() {
    await this.ensureMaintenanceBackupsTable();

    return this.settingsRepository.query(`
      SELECT
        id,
        file_name AS "fileName",
        file_size AS "fileSize",
        status,
        backup_type AS "backupType",
        restore_status AS "restoreStatus",
        restored_at AS "restoredAt",
        created_at AS "createdAt"
      FROM maintenance_backups
      ORDER BY created_at DESC
      LIMIT 20
    `);
  }

  async restoreBackup(id: string) {
    await this.ensureMaintenanceBackupsTable();
    const [backup] = await this.settingsRepository.query('SELECT id, payload FROM maintenance_backups WHERE id = $1', [
      id,
    ]);

    if (!backup) {
      throw new BadRequestException('النسخة الاحتياطية غير موجودة.');
    }

    await this.settingsRepository.manager.transaction(async (entityManager) => {
      const payload = backup.payload;

      await this.upsertRows(entityManager, 'settings', payload.settings ?? []);
      await this.upsertRows(entityManager, 'units', payload.units ?? []);
      await this.upsertRows(entityManager, 'item_categories', payload.itemCategories ?? []);
      await this.upsertRows(entityManager, 'expense_categories', payload.expenseCategories ?? []);
      await this.upsertRows(entityManager, 'items', payload.items ?? []);
      await entityManager.query(
        `
          UPDATE maintenance_backups
          SET restored_at = now(), restore_status = 'restored'
          WHERE id = $1
        `,
        [id],
      );
    });

    await this.update({
      maintenance: {
        lastBackupStatus: 'تمت استعادة النسخة الاحتياطية بنجاح',
        lastBackupAt: new Date().toISOString(),
      },
    });

    return { status: 'success', message: 'تمت استعادة النسخة الاحتياطية بنجاح.' };
  }

  async resetOperationalData(body: { confirmation?: string }) {
    if (body?.confirmation !== 'RESET') {
      throw new BadRequestException('اكتب RESET لتأكيد إعادة ضبط البيانات التشغيلية.');
    }

    const backup = await this.createManualBackupSnapshot();
    const operationalTables = [
      'attachments',
      'supplier_payments',
      'purchase_invoice_items',
      'purchase_invoices',
      'expenses',
      'daily_sales',
      'drawer_transactions',
      'drawer_daily_sessions',
      'bank_account_transactions',
      'vault_transactions',
      'payroll_payments',
      'payroll_records',
      'employee_advances',
      'employee_penalties',
      'attendance_files',
      'branch_transfer_items',
      'branch_transfers',
      'stock_count_items',
      'stock_counts',
      'undo_actions',
    ];

    await this.settingsRepository.manager.transaction(async (entityManager) => {
      const existingTables = await entityManager.query<{ table_name: string }[]>(
        `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = ANY($1)
        `,
        [operationalTables],
      );
      const tablesToReset = operationalTables.filter((table) =>
        existingTables.some((row) => row.table_name === table),
      );

      if (tablesToReset.length === 0) {
        return;
      }

      const tableSql = tablesToReset.map((table) => `"${table}"`).join(', ');
      await entityManager.query(`TRUNCATE TABLE ${tableSql} RESTART IDENTITY CASCADE`);
    });

    await this.update({
      maintenance: {
        lastBackupStatus: 'تم إنشاء نسخة احتياطية قبل إعادة ضبط البيانات التشغيلية',
        lastBackupAt: new Date().toISOString(),
      },
    });

    return {
      status: 'success',
      backupId: backup.id,
      message: 'تم إنشاء نسخة احتياطية ثم إعادة ضبط البيانات التشغيلية بنجاح.',
    };
  }

  private buildSettingsResponse(rows: SettingEntity[]) {
    return {
      groups: settingsRegistry.map((group) => ({
        key: group.key,
        title: group.title,
        description: group.description,
        fields: group.fields.map((field) => {
          const row = rows.find((setting) => setting.group === group.key && setting.key === field.key);

          return {
            key: field.key,
            label: field.label,
            type: field.type,
            value: row?.value ?? field.defaultValue,
            defaultValue: field.defaultValue,
            note: field.note ?? null,
            options: field.options ?? null,
            min: field.min ?? null,
            max: field.max ?? null,
          };
        }),
      })),
    };
  }

  private async ensureRegistryRows() {
    if (!this.registrySyncPromise) {
      this.registrySyncPromise = this.syncRegistryRows().catch((error) => {
        this.registrySyncPromise = null;
        throw error;
      });
    }

    await this.registrySyncPromise;
  }

  private async syncRegistryRows() {
    await this.ensureSettingsTable();

    const definitions = flattenSettingsRegistry();
    const rows = await this.settingsRepository.find();
    const existingKeys = new Set(rows.map((row) => `${row.group}.${row.key}`));

    const missingRows = definitions
      .filter(({ group, field }) => !existingKeys.has(`${group.key}.${field.key}`))
      .map(({ group, field, sortOrder }) =>
        this.settingsRepository.create({
          group: group.key,
          key: field.key,
          value: field.defaultValue,
          label: field.label,
          type: field.type,
          note: field.note ?? null,
          options: field.options ?? null,
          sortOrder,
        }),
      );

    if (missingRows.length > 0) {
      await this.settingsRepository.save(missingRows);
    }

    await Promise.all(
      definitions.map(async ({ group, field, sortOrder }) => {
        const row = rows.find((setting) => setting.group === group.key && setting.key === field.key);

        if (!row) {
          return;
        }

        row.label = field.label;
        row.type = field.type;
        row.note = field.note ?? null;
        row.options = field.options ?? null;
        row.sortOrder = sortOrder;
        await this.settingsRepository.save(row);
      }),
    );
  }

  private async ensureSettingsTable() {
    await this.settingsRepository.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await this.settingsRepository.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "group" varchar(80) NOT NULL,
        key varchar(120) NOT NULL,
        value jsonb,
        label varchar(180) NOT NULL,
        type varchar(30) NOT NULL,
        note text,
        options jsonb,
        sort_order int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_settings_group_key UNIQUE ("group", key)
      )
    `);
  }

  private async ensureMaintenanceBackupsTable() {
    await this.settingsRepository.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await this.settingsRepository.query(`
      CREATE TABLE IF NOT EXISTS maintenance_backups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        file_name varchar(220) NOT NULL,
        file_path text,
        file_size bigint,
        status varchar(40) NOT NULL DEFAULT 'success',
        backup_type varchar(40) NOT NULL DEFAULT 'manual',
        payload jsonb NOT NULL,
        restored_at timestamptz,
        restore_status varchar(80),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  private async buildBackupPayload(createdAt: string) {
    await this.ensureRegistryRows();

    const operationalTables = [
      'supplier_payments',
      'purchase_invoice_items',
      'purchase_invoices',
      'expenses',
      'daily_sales',
      'drawer_transactions',
      'drawer_daily_sessions',
      'bank_account_transactions',
      'vault_transactions',
      'payroll_records',
      'employee_advances',
      'employee_penalties',
      'attendance_files',
      'branch_transfer_items',
      'branch_transfers',
      'stock_count_items',
      'stock_counts',
    ];
    const [settings, units, itemCategories, expenseCategories, items] = await Promise.all([
      this.settingsRepository.query('SELECT * FROM settings ORDER BY sort_order ASC'),
      this.settingsRepository.query('SELECT * FROM units ORDER BY name ASC'),
      this.settingsRepository.query('SELECT * FROM item_categories ORDER BY name ASC'),
      this.settingsRepository.query('SELECT * FROM expense_categories ORDER BY name ASC'),
      this.settingsRepository.query('SELECT * FROM items ORDER BY name ASC'),
    ]);
    const operationalData = Object.fromEntries(
      await Promise.all(operationalTables.map(async (table) => [table, await this.readTableRows(table)])),
    );

    return {
      version: 2,
      createdAt,
      scope: 'settings-master-operational-snapshot',
      settings,
      units,
      itemCategories,
      expenseCategories,
      items,
      operationalData,
    };
  }

  private async readTableRows(table: string) {
    const [tableExists] = await this.settingsRepository.query(
      `
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = $1
      `,
      [table],
    );

    if (!tableExists) {
      return [];
    }

    return this.settingsRepository.query(`SELECT * FROM "${table}"`);
  }

  private async upsertRows(
    entityManager: { query: (query: string, parameters?: unknown[]) => Promise<unknown> },
    table: string,
    rows: Record<string, unknown>[],
  ) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return;
    }

    const allowedTables = new Set(['settings', 'units', 'item_categories', 'expense_categories', 'items']);

    if (!allowedTables.has(table)) {
      throw new BadRequestException('جدول النسخة الاحتياطية غير مدعوم.');
    }

    for (const row of rows) {
      const columns = Object.keys(row).filter((key) => !['created_at', 'updated_at'].includes(key));
      const values = columns.map((column) => row[column]);
      const columnSql = columns.map((column) => `"${column}"`).join(', ');
      const placeholderSql = columns.map((_, index) => `$${index + 1}`).join(', ');
      const updateSql = columns
        .filter((column) => column !== 'id')
        .map((column) => `"${column}" = EXCLUDED."${column}"`)
        .join(', ');

      await entityManager.query(
        `
          INSERT INTO ${table} (${columnSql})
          VALUES (${placeholderSql})
          ON CONFLICT (id) DO UPDATE SET ${updateSql}
        `,
        values,
      );
    }
  }

  private normalizeValue(field: SettingFieldDefinition, value: SettingValue) {
    if (field.type === 'boolean') {
      if (typeof value !== 'boolean') {
        throw new BadRequestException(`${field.label} يجب أن يكون نعم أو لا.`);
      }

      return value;
    }

    if (field.type === 'number') {
      const numericValue = Number(value);

      if (!Number.isFinite(numericValue)) {
        throw new BadRequestException(`${field.label} يجب أن يكون رقما صحيحا.`);
      }

      if (field.min !== undefined && numericValue < field.min) {
        throw new BadRequestException(`${field.label} يجب ألا يقل عن ${field.min}.`);
      }

      if (field.max !== undefined && numericValue > field.max) {
        throw new BadRequestException(`${field.label} يجب ألا يزيد عن ${field.max}.`);
      }

      return numericValue;
    }

    const stringValue = value === null ? '' : String(value).trim();

    if (field.type === 'email' && stringValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)) {
      throw new BadRequestException(`${field.label} يجب أن يكون بريدا إلكترونيا صحيحا.`);
    }

    if (field.type === 'url' && stringValue) {
      const isRelativeAssetPath = stringValue.startsWith('/');

      if (!isRelativeAssetPath) {
        try {
          const url = new URL(stringValue);

          if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('Unsupported URL protocol.');
          }
        } catch {
          throw new BadRequestException(`${field.label} يجب أن يكون رابطا صحيحا.`);
        }
      }
    }

    if (field.type === 'color' && !/^#[0-9a-fA-F]{6}$/.test(stringValue)) {
      throw new BadRequestException(`${field.label} يجب أن يكون لون HEX صحيحا.`);
    }

    if (field.type === 'select' && field.options && !field.options.some((option) => option.value === stringValue)) {
      throw new BadRequestException(`${field.label} يحتوي على خيار غير مدعوم.`);
    }

    return stringValue;
  }
}
