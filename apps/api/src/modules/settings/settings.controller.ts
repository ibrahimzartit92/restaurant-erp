import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  findAll() {
    return this.settingsService.findAll();
  }

  @Patch()
  update(@Body() updateSettingsDto: UpdateSettingsDto) {
    return this.settingsService.update(updateSettingsDto.values);
  }

  @Post('backup/manual')
  createManualBackupSnapshot() {
    return this.settingsService.createManualBackupSnapshot();
  }

  @Get('backups')
  listBackups() {
    return this.settingsService.listBackups();
  }

  @Post('backups/:id/restore')
  restoreBackup(@Param('id') id: string) {
    return this.settingsService.restoreBackup(id);
  }
}
