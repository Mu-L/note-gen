'use client'

import React, { useEffect, useState, useCallback, useRef } from "react"
import { FileManager } from "./file-manager"
import { FileFooter } from "./file-footer"
import useArticleStore from "@/stores/article"
import useClipboardStore from "@/stores/clipboard"
import { isMobileDevice } from "@/lib/check"
import { platform } from "@tauri-apps/plugin-os"

type Platform = 'macos' | 'windows' | 'linux' | 'unknown'

/**
 * 统一的文件管理器快捷键处理
 * 只有当文件管理器区域获得焦点时才响应快捷键
 */
function useFileManagerShortcuts() {
  const { activeFilePath, fileTree } = useArticleStore()
  const { setClipboardItem } = useClipboardStore()
  const [currentPlatform, setCurrentPlatform] = useState<Platform>('unknown')
  const [isFocused, setIsFocused] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // 检测当前平台
  useEffect(() => {
    try {
      const p = platform()
      if (p === 'macos') {
        setCurrentPlatform('macos')
      } else if (p === 'windows') {
        setCurrentPlatform('windows')
      } else if (p === 'linux') {
        setCurrentPlatform('linux')
      }
    } catch {
      setCurrentPlatform('unknown')
    }
  }, [])

  // 检查是否按下了正确的修饰键
  const isModKey = useCallback((e: KeyboardEvent): boolean => {
    if (currentPlatform === 'macos') {
      return e.metaKey && !e.ctrlKey
    } else {
      return e.ctrlKey && !e.metaKey
    }
  }, [currentPlatform])

  // 获取当前激活的 item（文件或文件夹）
  const getActiveItem = useCallback((): { path: string; isDirectory: boolean; isLocale: boolean; name: string; sha?: string } | null => {
    if (!activeFilePath) return null

    // 递归查找文件树中匹配的项
    function findInTree(tree: typeof fileTree, targetPath: string): ReturnType<typeof getActiveItem> {
      for (const item of tree) {
        const itemPath = item.parent ? `${item.parent.name}/${item.name}` : item.name

        if (itemPath === targetPath || (item.parent && targetPath === `${item.parent.name}/${item.name}`)) {
          return {
            path: activeFilePath,
            isDirectory: item.isDirectory,
            isLocale: item.isLocale,
            name: item.name,
            sha: item.sha
          }
        }

        if (item.children) {
          const found = findInTree(item.children, targetPath)
          if (found) return found
        }
      }
      return null
    }

    return findInTree(fileTree, activeFilePath)
  }, [activeFilePath, fileTree])

  // 处理快捷键
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 移动端不处理快捷键
    if (isMobileDevice()) {
      return
    }

    // 只有文件管理器有焦点时才处理
    if (!isFocused) {
      return
    }

    const activeItem = getActiveItem()
    if (!activeItem || !activeItem.isLocale) {
      return
    }

    const modPressed = isModKey(e)

    // 复制: Cmd+C / Ctrl+C
    if (modPressed && e.key === 'c') {
      e.preventDefault()
      e.stopPropagation()
      setClipboardItem({
        path: activeItem.path,
        name: activeItem.name,
        isDirectory: activeItem.isDirectory,
        sha: activeItem.sha,
        isLocale: activeItem.isLocale
      }, 'copy')
      return
    }

    // 剪切: Cmd+X / Ctrl+X
    if (modPressed && e.key === 'x') {
      e.preventDefault()
      e.stopPropagation()
      setClipboardItem({
        path: activeItem.path,
        name: activeItem.name,
        isDirectory: activeItem.isDirectory,
        sha: activeItem.sha,
        isLocale: activeItem.isLocale
      }, 'cut')
      return
    }

    // 粘贴: Cmd+V / Ctrl+V
    if (modPressed && e.key === 'v') {
      e.preventDefault()
      e.stopPropagation()
      // 触发粘贴操作（通过事件或直接调用）
      const event = new CustomEvent('filemanager-paste', { detail: { targetPath: activeItem.path } })
      window.dispatchEvent(event)
      return
    }

    // 删除: macOS 使用 Backspace，Windows/Linux 使用 Delete
    const isDeleteKey = currentPlatform === 'macos'
      ? e.key === 'Backspace'
      : e.key === 'Delete'

    if (isDeleteKey) {
      e.preventDefault()
      e.stopPropagation()
      const event = new CustomEvent('filemanager-delete', { detail: { item: activeItem } })
      window.dispatchEvent(event)
      return
    }

    // 重命名: macOS 使用 Enter 键，Windows/Linux 使用 F2 键
    const isRenameKey = currentPlatform === 'macos'
      ? e.key === 'Enter'
      : e.key === 'F2'

    if (isRenameKey) {
      e.preventDefault()
      e.stopPropagation()
      const event = new CustomEvent('filemanager-rename', { detail: { path: activeItem.path } })
      window.dispatchEvent(event)
      return
    }
  }, [isFocused, getActiveItem, isModKey, currentPlatform, setClipboardItem])

  // 注册全局快捷键
  useEffect(() => {
    if (isMobileDevice() || currentPlatform === 'unknown') {
      return
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, currentPlatform])

  // 焦点处理
  const handleFocusIn = useCallback((e: FocusEvent) => {
    // 检查焦点是否在文件管理器区域内
    if (sidebarRef.current && sidebarRef.current.contains(e.target as Node)) {
      setIsFocused(true)
    }
  }, [])

  const handleFocusOut = useCallback(() => {
    // 延迟检查，因为 focusOut 会在新元素获得焦点前触发
    setTimeout(() => {
      if (sidebarRef.current && !sidebarRef.current.contains(document.activeElement)) {
        setIsFocused(false)
      }
    }, 0)
  }, [])

  useEffect(() => {
    if (sidebarRef.current) {
      sidebarRef.current.addEventListener('focusin', handleFocusIn)
      sidebarRef.current.addEventListener('focusout', handleFocusOut)

      return () => {
        sidebarRef.current?.removeEventListener('focusin', handleFocusIn)
        sidebarRef.current?.removeEventListener('focusout', handleFocusOut)
      }
    }
  }, [handleFocusIn, handleFocusOut])

  return { sidebarRef, isFocused }
}

export function FileSidebar() {
  const { initCollapsibleList, initSortSettings, initShowCloudFiles } = useArticleStore()
  const { sidebarRef } = useFileManagerShortcuts()

  useEffect(() => {
    initCollapsibleList()
    initSortSettings()
    initShowCloudFiles()
  }, [])

  return (
    <div
      ref={sidebarRef}
      id="article-sidebar"
      className="w-full h-full flex flex-col outline-none"
      tabIndex={-1}
    >
      <div className="flex-1 overflow-x-hidden overflow-y-auto">
        <FileManager />
      </div>
      <FileFooter />
    </div>
  )
}