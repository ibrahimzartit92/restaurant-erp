import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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

  async update(updatePayload: GroupedSettingsPayload) {
    await this.ensureRegistryRows();

    const definitions = flattenSettingsRegistry();
    const definitionsByGroupAndKey = new Map(definitions.map((definition) => [`${definition.group.key}.${definition.field.key}`, definition]));

    if (!updatePayload || typeof updatePayload !== 'object' || Array.isArray(updatePayload)) {
      throw new BadRequestException('Invalid settings payload.');
    }

    await this.settingsRepository.manager.transaction(async (entityManager) => {
      const settingsRepository = entityManager.getRepository(SettingEntity);
      const rows = await settingsRepository.find();
      const rowsByGroupAndKey = new Map(rows.map((row) => [`${row.group}.${row.key}`, row]));
      const rowsToSave: SettingEntity[] = [];

      for (const [groupKey, groupValues] of Object.entries(updatePayload)) {
        if (!groupValues || typeof groupValues !== 'object' || Array.isArray(groupValues)) {
          throw new BadRequestException(`Invalid settings group payload: ${groupKey}`);
        }

        for (const [fieldKey, rawValue] of Object.entries(groupValues)) {
          const definition = definitionsByGroupAndKey.get(`${groupKey}.${fieldKey}`);

          if (!definition) {
            throw new BadRequestException(`Unknown setting: ${groupKey}.${fieldKey}`);
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

    await this.update({
      maintenance: {
        backupType: 'manual',
        lastBackupStatus: 'تم إنشاء نسخة يدوية بنجاح',
        lastBackupAt: formattedDate,
      },
    });

    return {
      status: 'success',
      backupType: 'manual',
      lastBackupStatus: 'تم إنشاء نسخة يدوية بنجاح',
      lastBackupAt: formattedDate,
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

    const updateTasks = definitions.map(async ({ group, field, sortOrder }) => {
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
    });

    await Promise.all(updateTasks);
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

  private normalizeValue(field: SettingFieldDefinition, value: SettingValue) {
    if (field.type === 'boolean') {
      if (typeof value !== 'boolean') {
        throw new BadRequestException(`${field.label} must be true or false.`);
      }

      return value;
    }

    if (field.type === 'number') {
      const numericValue = Number(value);

      if (!Number.isFinite(numericValue)) {
        throw new BadRequestException(`${field.label} must be a valid number.`);
      }

      if (field.min !== undefined && numericValue < field.min) {
        throw new BadRequestException(`${field.label} must be at least ${field.min}.`);
      }

      if (field.max !== undefined && numericValue > field.max) {
        throw new BadRequestException(`${field.label} must be at most ${field.max}.`);
      }

      return numericValue;
    }

    const stringValue = value === null ? '' : String(value).trim();

    if (field.type === 'email' && stringValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)) {
      throw new BadRequestException(`${field.label} must be a valid email.`);
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
          throw new BadRequestException(`${field.label} must be a valid URL.`);
        }
      }
    }

    if (field.type === 'color' && !/^#[0-9a-fA-F]{6}$/.test(stringValue)) {
      throw new BadRequestException(`${field.label} must be a valid hex color.`);
    }

    if (field.type === 'select' && field.options && !field.options.some((option) => option.value === stringValue)) {
      throw new BadRequestException(`${field.label} contains an unsupported option.`);
    }

    return stringValue;
  }
}
