'use client'

import FinancialReport from '@/components/general-manager/reports/financialReport'

export const dynamic = 'force-static'
export default function FinancialReportPage() {
  return (
    <div className=" mx-4">
      <FinancialReport />
    </div>
  )
}
