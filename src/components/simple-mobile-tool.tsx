'use client'

import { Button } from "@/components/ui/button"
import { CheckSquare, ChevronRight, ImagePlus, Link, Mic, Paperclip, SquarePen, Type } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface SimpleMobileToolProps {
  toolId: string
  onToolClick?: (toolId: string) => void
  featured?: boolean
}

export function SimpleMobileTool({ toolId, onToolClick, featured = false }: SimpleMobileToolProps) {
  const t = useTranslations()

  const getToolInfo = (id: string) => {
    switch (id) {
      case 'text':
        return { icon: <Type className="size-4" />, label: t('record.mark.type.text') }
      case 'recording':
        return { icon: <Mic className="size-4" />, label: t('record.mark.type.recording') }
      case 'image':
        return { icon: <ImagePlus className="size-4" />, label: t('record.mark.type.image') }
      case 'link':
        return { icon: <Link className="size-4" />, label: t('record.mark.type.link') }
      case 'file':
        return { icon: <Paperclip className="size-4" />, label: t('record.mark.type.file') }
      case 'todo':
        return { icon: <CheckSquare className="size-4" />, label: t('record.mark.type.todo') }
      case 'write':
        return { icon: <SquarePen className="size-5" />, label: t('navigation.write') }
      default:
        return { icon: null, label: '' }
    }
  }

  const toolInfo = getToolInfo(toolId)

  const handleClick = () => {
    if (onToolClick) {
      onToolClick(toolId)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      className={cn(
        "group flex h-auto min-w-0 rounded-xl transition-colors",
        featured
          ? "min-h-14 w-full justify-start gap-3 px-3"
          : "min-h-12 justify-start gap-2.5 px-3 py-2"
      )}
      aria-label={toolInfo.label}
      title={toolInfo.label}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          featured ? "size-9 bg-muted text-foreground" : "size-8 bg-muted text-foreground"
        )}
      >
        {toolInfo.icon}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-left leading-none",
          "text-sm font-medium text-foreground"
        )}
      >
        {toolInfo.label}
      </span>
      {featured ? (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5" />
      ) : null}
    </Button>
  )
}
