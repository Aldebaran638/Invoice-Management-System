import { createFileRoute } from "@tanstack/react-router"

import PurchaseRecordSummaryPage from "@/tools/purchase-records/purchase-record-summary/components/purchase-record-summary-page"

export const Route = createFileRoute("/_layout/purchase-record-summary")({
  component: PurchaseRecordSummaryRoute,
  head: () => ({
    meta: [
      {
        title: "购买记录汇总 - FastAPI Cloud",
      },
    ],
  }),
})

function PurchaseRecordSummaryRoute() {
  return <PurchaseRecordSummaryPage />
}
