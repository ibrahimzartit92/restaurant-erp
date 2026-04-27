import { IsObject } from 'class-validator';
import type { SettingValue } from '../entities/setting.entity';

export type GroupedSettingsPayload = Record<string, Record<string, SettingValue>>;

export class UpdateSettingsDto {
  @IsObject()
  values!: GroupedSettingsPayload;
}
