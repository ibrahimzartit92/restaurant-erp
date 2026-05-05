import { ItemsPriceTable } from '../../components/items-price-table';
import { PageHeader } from '../../components/page-header';
import { fetchList, getCurrencySettings } from '../../lib/api';

type ItemRow = {
  id: string;
  code: string;
  name: string;
  category?: { name: string } | null;
  unit?: { name: string } | null;
  purchasePrice?: number;
  initialPrice?: number;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
};

export default async function ItemsPage() {
  const [result, currencySettings] = await Promise.all([fetchList<ItemRow>('/items'), getCurrencySettings()]);

  return (
    <>
      <PageHeader
        title="المواد"
        description="قائمة المواد المستخدمة في المشتريات والمخزون والبيع. يمكن تعديل الأسعار مباشرة وسيتم حفظها تلقائيا."
        actionLabel="مادة جديدة"
        actionHref="/items/new"
      />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <ItemsPriceTable
        rows={result.data}
        currencySymbol={currencySettings.currencySymbol}
        decimalPlaces={currencySettings.decimalPlaces}
      />
    </>
  );
}
