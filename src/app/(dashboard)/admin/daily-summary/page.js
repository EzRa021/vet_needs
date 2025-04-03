import SalesSummary from "@/components/dailySummariesAdmins";


export const dynamic = 'force-static'
export default function DailySummaryPage() {
  return (
    <div className=" m-4">
      <SalesSummary/>
    </div>
  );
}