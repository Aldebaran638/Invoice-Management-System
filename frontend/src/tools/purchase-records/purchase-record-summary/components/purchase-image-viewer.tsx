import { ImageOff } from "lucide-react"
import { useMemo, useState } from "react"

import { OpenAPI } from "@/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

function toAbsoluteImageUrl(url?: string | null) {
  if (!url) {
    return null
  }

  if (/^https?:\/\//.test(url)) {
    return url
  }

  const base = OpenAPI.BASE || ""
  if (!base) {
    return url
  }

  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base
  const normalizedUrl = url.startsWith("/") ? url : `/${url}`
  return `${normalizedBase}${normalizedUrl}`
}

export function getPurchaseImageUrl(record: unknown) {
  const raw = (record as { purchase_image_url?: unknown })?.purchase_image_url
  if (!raw || typeof raw !== "string") {
    return null
  }

  return raw
}

function Placeholder() {
  return (
    <div className="flex h-10 w-14 items-center justify-center rounded border border-dashed text-muted-foreground">
      <ImageOff className="h-4 w-4" />
    </div>
  )
}

export function PurchaseImageThumbnail({ url, alt }: { url?: string | null; alt: string }) {
  const absoluteUrl = useMemo(() => toAbsoluteImageUrl(url), [url])
  const [previewError, setPreviewError] = useState(false)
  const [fullError, setFullError] = useState(false)

  if (!absoluteUrl) {
    return <span className="text-muted-foreground">无</span>
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="rounded border transition hover:opacity-80" aria-label="查看图片大图">
          {previewError ? (
            <Placeholder />
          ) : (
            <img
              src={absoluteUrl}
              alt={alt}
              className="h-10 w-14 rounded object-cover"
              onError={() => setPreviewError(true)}
            />
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>图片预览</DialogTitle>
        </DialogHeader>
        {fullError ? (
          <div className="flex h-40 items-center justify-center rounded border border-dashed text-muted-foreground">
            图片加载失败
          </div>
        ) : (
          <img
            src={absoluteUrl}
            alt={alt}
            className="max-h-[80vh] w-full rounded object-contain"
            onError={() => setFullError(true)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export function PurchaseImageDetail({ url, alt }: { url?: string | null; alt: string }) {
  const absoluteUrl = useMemo(() => toAbsoluteImageUrl(url), [url])
  const [imageError, setImageError] = useState(false)

  if (!absoluteUrl) {
    return null
  }

  return (
    <div className="grid grid-cols-[96px_1fr] gap-2">
      <span className="text-muted-foreground">图片</span>
      {imageError ? (
        <span className="text-muted-foreground">图片加载失败</span>
      ) : (
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className="w-fit rounded border">
              <img
                src={absoluteUrl}
                alt={alt}
                className="max-h-52 max-w-[300px] rounded object-cover"
                onError={() => setImageError(true)}
              />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>图片预览</DialogTitle>
            </DialogHeader>
            <img src={absoluteUrl} alt={alt} className="max-h-[80vh] w-full rounded object-contain" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
