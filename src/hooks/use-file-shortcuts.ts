import { useEffect, useCallback, useState } from 'react'
import { isMobileDevice } from '@/lib/check'
import { platform } from '@tauri-apps/plugin-os'
import useArticleStore from '@/stores/article'

type Platform = 'macos' | 'windows' | 'linux' | 'unknown'

interface FileShortcutsProps {
  path: string
  isEditing: boolean
  onStartRename: () => void
}

/**
 * 文件和文件夹快捷键 Hook
 * 桌面端：
 *   - macOS: Enter 键触发重命名
 *   - Windows/Linux: F2 键触发重命名
 * 移动端：不启用快捷键
 */
export function useFileShortcuts({ path, isEditing, onStartRename }: FileShortcutsProps) {
  const { activeFilePath } = useArticleStore()
  const [currentPlatform, setCurrentPlatform] = useState<Platform>('unknown')

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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 移动端不处理快捷键
    if (isMobileDevice()) {
      return
    }

    // 正在编辑时也忽略
    if (isEditing) {
      return
    }

    // macOS 使用 Enter 键，Windows/Linux 使用 F2 键
    const isRenameKey = currentPlatform === 'macos'
      ? e.key === 'Enter'
      : e.key === 'F2'

    if (isRenameKey && path === activeFilePath) {
      e.preventDefault()
      e.stopPropagation()
      onStartRename()
    }
  }, [activeFilePath, isEditing, onStartRename, path, currentPlatform])

  useEffect(() => {
    // 移动端不添加事件监听
    if (isMobileDevice() || currentPlatform === 'unknown') {
      return
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, currentPlatform])
}
