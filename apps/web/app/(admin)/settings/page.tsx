import { MaintenanceBackupsPanel } from '../../components/maintenance-backups-panel';
import { PageHeader } from '../../components/page-header';
import { SettingsCenterForm, type BackupSummary, type SettingGroup } from '../../components/settings-center-form';
import { fetchList, fetchOne } from '../../lib/api';
import { defaultSettingGroups } from '../../lib/settings-defaults';

type SettingsResponse = {
  groups: SettingGroup[];
};

export default async function SettingsPage() {
  const [settingsResult, backupsResult] = await Promise.all([
    fetchOne<SettingsResponse>('/settings'),
    fetchList<BackupSummary>('/settings/backups'),
  ]);
  const groups = settingsResult.data?.groups?.length ? settingsResult.data.groups : defaultSettingGroups;

  return (
    <>
      <PageHeader
        title="الإعدادات"
        description="مركز تحكم لإدارة سلوك النظام، الهوية البصرية، المالية، المخزون، الصلاحيات، التنبيهات، الطباعة والصيانة من واجهة واحدة."
      />
      <SettingsCenterForm groups={groups} />
      {backupsResult.error ? <p className="notice">{backupsResult.error}</p> : null}
      <MaintenanceBackupsPanel backups={backupsResult.data} />
    </>
  );
}
