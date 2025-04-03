import ExpensesReport from "@/components/manager/reports/expensesReport";


export const dynamic = 'force-static'
export default function ExpensesReportPage() {
  return (
    <div className=" mx-4">
      <ExpensesReport />
    </div>
  );
}
