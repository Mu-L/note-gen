import assert from 'node:assert/strict'
import test from 'node:test'

const editorLayoutStylesModule = await import(
  new URL('../src/lib/editor-layout-styles.ts', import.meta.url).href
).catch(() => ({} as Record<string, unknown>))

const { getEditorContentContainerClass } = editorLayoutStylesModule as {
  getEditorContentContainerClass?: (options: { centeredContent: boolean; isMobile: boolean }) => string
}

test('getEditorContentContainerClass keeps centered mode unchanged', () => {
  assert.equal(typeof getEditorContentContainerClass, 'function')

  const className = getEditorContentContainerClass?.({
    centeredContent: true,
    isMobile: false,
  }) || ''

  assert.match(className, /\bmax-w-3xl\b/)
  assert.match(className, /\bmx-auto\b/)
  assert.match(className, /\bpx-4\b/)
})

test('getEditorContentContainerClass adds larger desktop padding when content is not centered', () => {
  const className = getEditorContentContainerClass?.({
    centeredContent: false,
    isMobile: false,
  }) || ''

  assert.match(className, /\bpx-10\b/)
  assert.doesNotMatch(className, /\bmax-w-3xl\b/)
})

test('getEditorContentContainerClass does not add extra mobile padding', () => {
  const className = getEditorContentContainerClass?.({
    centeredContent: false,
    isMobile: true,
  }) || ''

  assert.equal(className, '')
})
