'use client'

import type { ReactNode } from 'react'
import { Cloud, FileText, Folder } from 'lucide-react'
import { MobileActionMenu } from '@/app/core/main/file/mobile-action-menu'
import { BrowserEntry } from './types'

interface EntryListItemProps {
  entry: BrowserEntry
  isActive: boolean
  onOpen: (entry: BrowserEntry) => void
  menuContent: ReactNode
  remoteLabel: string
  subtitle?: string
}

export function EntryListItem({
  entry,
  isActive,
  onOpen,
  menuContent,
  remoteLabel,
  subtitle,
}: EntryListItemProps) {
  return (
    <div
      className={`w-full text-left rounded-md border px-3 py-2 active:bg-accent transition-colors ${
        isActive ? 'border-primary bg-primary/5' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onOpen(entry)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2">
            {entry.type === 'folder' ? (
              <Folder className="size-4 text-muted-foreground shrink-0" />
            ) : (
              <FileText className="size-4 text-muted-foreground shrink-0" />
            )}
            <p className="text-sm font-medium truncate flex-1 min-w-0">{entry.name}</p>
            {!entry.isLocale && (
              <span
                className="inline-flex items-center shrink-0 text-sky-600 dark:text-sky-400"
                title={remoteLabel}
                aria-label={remoteLabel}
              >
                <Cloud className="size-4 stroke-[2.25]" />
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate mt-1">{subtitle}</p>
          )}
        </button>
        <MobileActionMenu className="shrink-0">
          {menuContent}
        </MobileActionMenu>
      </div>
    </div>
  )
}
