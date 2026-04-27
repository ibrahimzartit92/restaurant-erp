import { PageHeader } from '../../components/page-header';
import { SettingsCenterForm, type SettingGroup } from '../../components/settings-center-form';
import { fetchOne } from '../../lib/api';
import { defaultSettingGroups } from '../../lib/settings-defaults';

type SettingsResponse = {
  groups: SettingGroup[];
};

export default async function SettingsPage() {
  const result = await fetchOne<SettingsResponse>('/settings');
  const groups = result.data?.groups?.length ? result.data.groups : defaultSettingGroups;

  return (
    <>
      <PageHeader
        title="الإعدادات"
        description="مركز تحكم لإدارة السلوك العام للنظام، الهوية البصرية، الماليات، المخزون، الصلاحيات، التنبيهات، الطباعة والصيانة من واجهة واحدة."
      />
      <SettingsCenterForm groups={groups} />
    </>
  );
}
