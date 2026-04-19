import { createFileRoute } from "@tanstack/react-router"

import RecycleBinPage from "../../tools/purchase_records/recycle_bin/components/recycle-bin-page"

export const Route = createFileRoute("/_layout/recycle-bin")({
  component: RecycleBinRoute,
  head: () => ({
    meta: [
      {
        title: "回收站 - FastAPI Cloud",
      },
    ],
  }),
})

function RecycleBinRoute() {
  return <RecycleBinPage />
}
