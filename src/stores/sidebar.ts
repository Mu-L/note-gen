import { Store } from '@tauri-apps/plugin-store'
import { create } from 'zustand'


export interface SidebarState {
  fileSidebarVisible: boolean
  toggleFileSidebar: () => Promise<void>
  showFileSidebar: () => Promise<void>
  noteSidebarVisible: boolean
  toggleNoteSidebar: () => Promise<void>
  showNoteSidebar: () => Promise<void>
  leftSidebarVisible: boolean
  toggleLeftSidebar: () => Promise<void>
  centerPanelVisible: boolean
  toggleCenterPanel: () => Promise<void>
  rightSidebarVisible: boolean
  toggleRightSidebar: () => Promise<void>
  leftSidebarTab: 'files' | 'notes'
  setLeftSidebarTab: (tab: 'files' | 'notes') => Promise<void>
  initSidebarState: () => Promise<void>
}

// 从 localStorage 获取初始状态
const getInitialState = () => {
  if (typeof window === 'undefined') return { left: true, center: true, right: true }
  
  const leftState = localStorage.getItem('leftSidebarVisible')
  const centerState = localStorage.getItem('centerPanelVisible')
  const rightState = localStorage.getItem('rightSidebarVisible')
  
  return {
    left: leftState !== null ? leftState === 'true' : true,
    center: centerState !== null ? centerState === 'true' : true,
    right: rightState !== null ? rightState === 'true' : true,
  }
}

const initialState = getInitialState()

export const useSidebarStore = create<SidebarState>((set, get) => ({
  fileSidebarVisible: true,
  toggleFileSidebar: async () => {
    set((state) => ({
      fileSidebarVisible: !state.fileSidebarVisible
    }))
    const store = await Store.load('store.json')
    store.set('fileSidebarVisible', !store.get('fileSidebarVisible'))
  },
  showFileSidebar: async () => {
    set({ fileSidebarVisible: true })
    const store = await Store.load('store.json')
    store.set('fileSidebarVisible', true)
  },
  noteSidebarVisible: true,
  toggleNoteSidebar: async () => {
    set((state) => ({
      noteSidebarVisible: !state.noteSidebarVisible
    }))
    const store = await Store.load('store.json')
    store.set('noteSidebarVisible', !store.get('noteSidebarVisible'))
  },
  showNoteSidebar: async () => {
    set({ noteSidebarVisible: true })
    const store = await Store.load('store.json')
    store.set('noteSidebarVisible', true)
  },
  leftSidebarVisible: initialState.left,
  toggleLeftSidebar: async () => {
    const { leftSidebarVisible, centerPanelVisible, rightSidebarVisible } = get()
    // 防止全部关闭，至少保持一个面板开启
    if (leftSidebarVisible && !centerPanelVisible && !rightSidebarVisible) {
      return
    }
    const newState = !leftSidebarVisible
    set({ leftSidebarVisible: newState })
    localStorage.setItem('leftSidebarVisible', String(newState))
    const store = await Store.load('store.json')
    await store.set('leftSidebarVisible', newState)
    await store.save()
  },
  centerPanelVisible: initialState.center,
  toggleCenterPanel: async () => {
    const { leftSidebarVisible, centerPanelVisible, rightSidebarVisible } = get()
    // 防止全部关闭，至少保持一个面板开启
    if (!leftSidebarVisible && centerPanelVisible && !rightSidebarVisible) {
      return
    }
    const newState = !centerPanelVisible
    set({ centerPanelVisible: newState })
    localStorage.setItem('centerPanelVisible', String(newState))
    const store = await Store.load('store.json')
    await store.set('centerPanelVisible', newState)
    await store.save()
  },
  rightSidebarVisible: initialState.right,
  toggleRightSidebar: async () => {
    const { leftSidebarVisible, centerPanelVisible, rightSidebarVisible } = get()
    // 防止全部关闭，至少保持一个面板开启
    if (!leftSidebarVisible && !centerPanelVisible && rightSidebarVisible) {
      return
    }
    const newState = !rightSidebarVisible
    set({ rightSidebarVisible: newState })
    localStorage.setItem('rightSidebarVisible', String(newState))
    const store = await Store.load('store.json')
    await store.set('rightSidebarVisible', newState)
    await store.save()
  },
  leftSidebarTab: 'files',
  setLeftSidebarTab: async (tab: 'files' | 'notes') => {
    set({ leftSidebarTab: tab })
    localStorage.setItem('leftSidebarTab', tab)
    const store = await Store.load('store.json')
    await store.set('leftSidebarTab', tab)
    await store.save()
  },
  initSidebarState: async () => {
    const store = await Store.load('store.json')
    const leftState = await store.get<boolean>('leftSidebarVisible')
    const centerState = await store.get<boolean>('centerPanelVisible')
    const rightState = await store.get<boolean>('rightSidebarVisible')
    const leftTab = await store.get<'files' | 'notes'>('leftSidebarTab')
    
    if (leftState !== null && leftState !== undefined) {
      set({ leftSidebarVisible: leftState })
      localStorage.setItem('leftSidebarVisible', String(leftState))
    }
    if (centerState !== null && centerState !== undefined) {
      set({ centerPanelVisible: centerState })
      localStorage.setItem('centerPanelVisible', String(centerState))
    }
    if (rightState !== null && rightState !== undefined) {
      set({ rightSidebarVisible: rightState })
      localStorage.setItem('rightSidebarVisible', String(rightState))
    }
    if (leftTab) {
      set({ leftSidebarTab: leftTab })
      localStorage.setItem('leftSidebarTab', leftTab)
    }
  },
}))
