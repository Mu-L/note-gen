import assert from 'node:assert/strict'
import test from 'node:test'

const { buildMessagesWithHistory } = await import(
  new URL('../src/lib/ai/history-messages.ts', import.meta.url).href
)

test('buildMessagesWithHistory keeps assistant history and prefers condensed content', () => {
  const messages = buildMessagesWithHistory(
    [
      {
        id: 1,
        role: 'user',
        type: 'chat',
        content: '第一轮问题',
      },
      {
        id: 2,
        role: 'system',
        type: 'chat',
        content: '这是原始长回复',
        condensedContent: '这是摘要回复',
      },
      {
        id: 3,
        role: 'user',
        type: 'chat',
        content: '第二轮问题',
      },
    ] as any,
    undefined,
    '额外上下文',
    '第二轮问题',
    {
      includeAssistantMessages: true,
      includeLatestUserMessage: false,
      maxUserMessages: 10,
    },
  )

  assert.deepEqual(messages, [
    { role: 'user', content: '第一轮问题' },
    { role: 'assistant', content: '这是摘要回复' },
    { role: 'system', content: '额外上下文' },
    { role: 'user', content: '第二轮问题' },
  ])
})
