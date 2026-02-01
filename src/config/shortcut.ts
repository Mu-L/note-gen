export enum ShortcutSettings {
  screenshot = "shotcut-screenshot",
  text = "shotcut-text",
  pin = "window-pin",
  link = "shotcut-link"
}

export enum ShortcutDefault {
  screenshot = "Control+Shift+S",
  text = "Control+Shift+T",
  pin = "Control+Shift+P",
  link = "Control+Shift+L",
}

/**
 * 文件管理器快捷键
 * rename: F2 - 重命名选中的文件或文件夹（仅桌面端）
 */
export const FileShortcuts = {
  rename: 'F2'
} as const