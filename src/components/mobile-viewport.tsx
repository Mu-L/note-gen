'use client'

import { useEffect } from 'react'

const KEYBOARD_OPEN_THRESHOLD = 80
const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

function isEditableElement(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && target.matches(EDITABLE_SELECTOR)
}

export function MobileViewport() {
  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const timers = new Set<number>()
    let hasEditableFocus = isEditableElement(document.activeElement)

    const setTimer = (callback: () => void, delay: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id)
        callback()
      }, delay)
      timers.add(id)
    }

    const updateViewportVars = () => {
      const viewport = window.visualViewport
      const viewportHeight = viewport?.height ?? window.innerHeight
      const viewportWidth = viewport?.width ?? window.innerWidth
      const viewportOffsetTop = viewport?.offsetTop ?? 0
      const keyboardInset = Math.max(0, window.innerHeight - viewportHeight - viewportOffsetTop)
      const keyboardOpen = hasEditableFocus || keyboardInset > KEYBOARD_OPEN_THRESHOLD

      root.style.setProperty('--mobile-viewport-height', `${viewportHeight}px`)
      root.style.setProperty('--mobile-viewport-width', `${viewportWidth}px`)
      root.style.setProperty('--mobile-viewport-offset-top', `${Math.max(0, viewportOffsetTop)}px`)
      root.style.setProperty('--mobile-keyboard-inset', `${keyboardOpen ? keyboardInset : 0}px`)
      root.classList.toggle('mobile-keyboard-open', keyboardOpen)
      body.classList.toggle('mobile-keyboard-open', keyboardOpen)
    }

    const keepFocusedElementVisible = () => {
      updateViewportVars()

      const activeElement = document.activeElement
      if (!(activeElement instanceof HTMLElement) || !isEditableElement(activeElement)) {
        return
      }

      activeElement.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'smooth',
      })
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (!isEditableElement(event.target)) {
        return
      }

      hasEditableFocus = true
      updateViewportVars()
      setTimer(keepFocusedElementVisible, 120)
      setTimer(keepFocusedElementVisible, 320)
    }

    const handleFocusOut = () => {
      setTimer(() => {
        hasEditableFocus = isEditableElement(document.activeElement)
        updateViewportVars()
      }, 120)
      setTimer(() => {
        hasEditableFocus = isEditableElement(document.activeElement)
        updateViewportVars()
      }, 320)
    }

    const handleOrientationChange = () => {
      updateViewportVars()
      setTimer(updateViewportVars, 250)
    }

    updateViewportVars()

    window.visualViewport?.addEventListener('resize', updateViewportVars)
    window.visualViewport?.addEventListener('scroll', updateViewportVars)
    window.addEventListener('resize', updateViewportVars)
    window.addEventListener('orientationchange', handleOrientationChange)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewportVars)
      window.visualViewport?.removeEventListener('scroll', updateViewportVars)
      window.removeEventListener('resize', updateViewportVars)
      window.removeEventListener('orientationchange', handleOrientationChange)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
      timers.forEach((id) => window.clearTimeout(id))
      root.classList.remove('mobile-keyboard-open')
      body.classList.remove('mobile-keyboard-open')
      root.style.removeProperty('--mobile-viewport-height')
      root.style.removeProperty('--mobile-viewport-width')
      root.style.removeProperty('--mobile-viewport-offset-top')
      root.style.removeProperty('--mobile-keyboard-inset')
    }
  }, [])

  return null
}
