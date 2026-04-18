import { createFileRoute } from "@tanstack/react-router"

import PurchaseRecordsPage from "@/tools/purchase-records/PurchaseRecordsPage"
import { purchaseRecordsViewSchema } from "@/tools/purchase-records/schemas"

export const Route = createFileRoute("/_layout/purchase-records")({
    component: PurchaseRecordsRoute,
    validateSearch: purchaseRecordsViewSchema,
    head: () => ({
        meta: [
            {
                title: "购买记录汇总 - FastAPI Cloud",
            },
        ],
    }),
})

function PurchaseRecordsRoute() {
    const { view } = Route.useSearch()

    return <PurchaseRecordsPage view={view} />
}