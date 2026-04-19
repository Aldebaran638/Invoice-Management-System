import { Upload, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { OpenAPI } from "@/client"
import { Button } from "@/components/ui/button"

type UploadResponse = {
  data?: {
    url?: string
  }
  url?: string
}

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

async function resolveToken() {
  if (!OpenAPI.TOKEN) {
    return ""
  }

  if (typeof OpenAPI.TOKEN === "function") {
    return OpenAPI.TOKEN({} as never)
  }

  return OpenAPI.TOKEN
}

export function PurchaseImageUpload({
  value,
  onChange,
}: {
  value?: string | null
  onChange: (url: string | null) => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl)
      }
    }
  }, [localPreviewUrl])

  const displayUrl = useMemo(() => {
    if (localPreviewUrl) {
      return localPreviewUrl
    }
    return toAbsoluteImageUrl(value)
  }, [localPreviewUrl, value])

  const pickFile = (file: File | null) => {
    if (!file) {
      return
    }

    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl)
    }
    setSelectedFile(file)
    setLocalPreviewUrl(URL.createObjectURL(file))
    setErrorMessage(null)
  }

  const onUpload = async () => {
    if (!selectedFile) {
      setErrorMessage("请先选择图片文件")
      return
    }

    const formData = new FormData()
    formData.append("file", selectedFile)

    setUploading(true)
    setErrorMessage(null)
    try {
      const token = await resolveToken()
      const response = await fetch(`${OpenAPI.BASE || ""}/api/v1/purchase-records/purchase-record-summary/upload-image`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      const body = (await response.json()) as UploadResponse | { detail?: string }

      if (!response.ok) {
        const detail = (body as { detail?: string }).detail
        throw new Error(detail || "图片上传失败")
      }

      const url = (body as UploadResponse).data?.url || (body as UploadResponse).url
      if (!url) {
        throw new Error("上传成功但未返回图片地址")
      }

      onChange(url)
      setSelectedFile(null)
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl)
      }
      setLocalPreviewUrl(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "图片上传失败")
    } finally {
      setUploading(false)
    }
  }

  const clearImage = () => {
    onChange(null)
    setSelectedFile(null)
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl)
    }
    setLocalPreviewUrl(null)
    setErrorMessage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-3 rounded border p-3">
      <div className="text-sm font-medium">购买记录图片</div>

      <div
        className={`rounded border border-dashed p-4 text-sm ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30"}`}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setIsDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          const file = event.dataTransfer.files?.[0] ?? null
          pickFile(file)
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            点击选择图片
          </Button>
          <span className="text-muted-foreground">或拖拽图片到此处（jpg/jpeg/png）</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
        />
      </div>

      {displayUrl ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">图片预览</div>
          <img src={displayUrl} alt="购买记录图片预览" className="max-h-52 max-w-[300px] rounded border object-cover" />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onUpload} disabled={!selectedFile || uploading}>
          {uploading ? "上传中..." : "上传图片"}
        </Button>
        <Button type="button" variant="outline" onClick={clearImage} disabled={!value && !localPreviewUrl && !selectedFile}>
          <X className="mr-2 h-4 w-4" />
          删除图片
        </Button>
      </div>

      {value ? <div className="text-xs text-muted-foreground">已上传路径：{value}</div> : null}
      {errorMessage ? <div className="text-sm text-destructive">{errorMessage}</div> : null}
    </div>
  )
}
