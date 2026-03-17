export function getEditorContentContainerClass(options: {
  centeredContent: boolean
  isMobile: boolean
}) {
  if (options.isMobile) {
    return ''
  }

  if (options.centeredContent) {
    return 'max-w-3xl mx-auto px-4'
  }

  return 'px-10'
}
