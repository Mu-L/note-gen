import assert from 'node:assert/strict'
import test from 'node:test'

const toolbarShortcutsModule = await import(
  new URL('../src/lib/toolbar-shortcuts.ts', import.meta.url).href
).catch(() => ({} as Record<string, unknown>))

const { resolveToolbarShortcutIndex } = toolbarShortcutsModule as {
  resolveToolbarShortcutIndex?: (
    event: {
      key: string
      metaKey?: boolean
      altKey?: boolean
      ctrlKey?: boolean
      shiftKey?: boolean
      repeat?: boolean
    },
    platform: 'macos' | 'windows' | 'linux' | 'unknown',
    enabledItemCount: number,
  ) => number | null
}

test('resolveToolbarShortcutIndex matches Command+digit on macOS', () => {
  assert.equal(typeof resolveToolbarShortcutIndex, 'function')

  assert.equal(
    resolveToolbarShortcutIndex?.({
      key: '1',
      metaKey: true,
      altKey: false,
      ctrlKey: false,
      shiftKey: false,
      repeat: false,
    }, 'macos', 3),
    0,
  )

  assert.equal(
    resolveToolbarShortcutIndex?.({
      key: '3',
      metaKey: true,
      altKey: false,
      ctrlKey: false,
      shiftKey: false,
      repeat: false,
    }, 'macos', 3),
    2,
  )
})

test('resolveToolbarShortcutIndex ignores shortcuts without the platform modifier', () => {
  assert.equal(
    resolveToolbarShortcutIndex?.({
      key: '1',
      metaKey: false,
      altKey: false,
      ctrlKey: false,
      shiftKey: false,
      repeat: false,
    }, 'macos', 3),
    null,
  )

  assert.equal(
    resolveToolbarShortcutIndex?.({
      key: '1',
      metaKey: false,
      altKey: false,
      ctrlKey: true,
      shiftKey: false,
      repeat: false,
    }, 'macos', 3),
    null,
  )
})

test('resolveToolbarShortcutIndex uses Alt+digit on Windows and Linux', () => {
  assert.equal(
    resolveToolbarShortcutIndex?.({
      key: '2',
      metaKey: false,
      altKey: true,
      ctrlKey: false,
      shiftKey: false,
      repeat: false,
    }, 'windows', 4),
    1,
  )

  assert.equal(
    resolveToolbarShortcutIndex?.({
      key: '9',
      metaKey: false,
      altKey: true,
      ctrlKey: false,
      shiftKey: false,
      repeat: false,
    }, 'linux', 5),
    null,
  )
})
