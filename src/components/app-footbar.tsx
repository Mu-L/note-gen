'use client'

import { MessageSquare, Highlighter, SquarePen, Settings, User, Plus, CopySlash, Mic, ScanText, ImagePlus, Link, FileText } from "lucide-react"
import { usePathname, useRouter } from 'next/navigation'
import { cn } from "@/lib/utils"
import { Store } from "@tauri-apps/plugin-store"
import { useTranslations } from 'next-intl'
import { useSidebarStore } from "@/stores/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import useSettingStore from "@/stores/setting"
import useSyncStore from "@/stores/sync"
import { UserInfo } from "@/lib/sync/github.types"
import { getUserInfo } from "@/lib/sync/github"
import { useEffect, useState } from "react"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import emitter from '@/lib/emitter'

// 普通导航按钮组件
interface NormalNavButtonProps {
  item: {
    title: string
    url: string
    icon: React.ComponentType<{ className?: string }>
  }
  isActive: boolean
  onClick: () => void
}

function NormalNavButton({ item, isActive, onClick }: NormalNavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center w-1/5 py-1 transition-colors relative",
        isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
      )}
    >
      <item.icon className="h-5 w-5" />
      <span className="text-xs mt-0.5">{item.title}</span>
      {isActive && (
        <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />
      )}
    </button>
  )
}

// 头像导航按钮组件
interface AvatarNavButtonProps {
  item: {
    title: string
    url: string
  }
  isActive: boolean
  avatarUrl: string
  onClick: () => void
}

function AvatarNavButton({ item, isActive, avatarUrl, onClick }: AvatarNavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center w-1/5 py-1 transition-colors relative",
        isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
      )}
    >
      <div className="flex flex-col items-center">
        <Avatar className="h-6 w-6">
          <AvatarImage 
            src={avatarUrl} 
            alt="Profile" 
          />
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <span className="text-xs mt-0.5">{item.title}</span>
        {isActive && (
          <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />
        )}
      </div>
    </button>
  )
}

// 快捷记录按钮组件
interface QuickRecordNavButtonProps {
  onClick: () => void
}
function QuickRecordNavButton({ onClick }: QuickRecordNavButtonProps) {
  return (
    <button className="w-1/5 flex items-center justify-center" onClick={onClick}>
      <Plus className="size-10 bg-primary text-primary-foreground rounded-full p-2" />
    </button>
  )
}

export function AppFootbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toggleFileSidebar } = useSidebarStore()
  const [quickRecordOpen, setQuickRecordOpen] = useState(false)
  const { 
    githubUsername,
    accessToken,
    primaryBackupMethod,
    giteeAccessToken,
    gitlabAccessToken,
    giteaAccessToken,
    setGithubUsername,
    setGitlabUsername,
    setGiteaUsername,
    recordToolbarConfig,
  } = useSettingStore()
  const {
    setUserInfo,
    setSyncRepoInfo,
    setGiteeSyncRepoInfo,
    setGitlabSyncProjectInfo,
    setGiteeUserInfo,
    setGitlabUserInfo,
    setGiteaSyncRepoInfo,
    setGiteaUserInfo,
    giteeUserInfo,
    gitlabUserInfo,
    giteaUserInfo,
  } = useSyncStore()
  const t = useTranslations()
  
  // 检查是否有 GitHub、Gitee、Gitlab 或 Gitea 账号，用于显示头像
  const hasGithubAccount = Boolean(githubUsername && accessToken)
  const hasGiteeAccount = Boolean(giteeAccessToken)
  const hasGitlabAccount = Boolean(gitlabAccessToken)
  const hasGiteaAccount = Boolean(giteaAccessToken)
  const showAvatar = hasGithubAccount || hasGiteeAccount || hasGitlabAccount || hasGiteaAccount

  // 获取当前主要备份方式的用户信息
  async function handleGetUserInfo() {
    try {
      if (primaryBackupMethod === 'github') {
        if (accessToken) {
          setSyncRepoInfo(undefined)
          const res = await getUserInfo()
          if (res) {
            setUserInfo(res.data as UserInfo)
            setGithubUsername(res.data.login)
          }
        }
      } else if (primaryBackupMethod === 'gitee') {
        if (giteeAccessToken) {
          // 获取 Gitee 用户信息
          setGiteeSyncRepoInfo(undefined)
          const res = await import('@/lib/sync/gitee').then(module => module.getUserInfo())
          if (res) {
            setGiteeUserInfo(res)
          }
        }
      } else if (primaryBackupMethod === 'gitlab') {
        if (gitlabAccessToken) {
          // 获取 Gitlab 用户信息
          setGitlabSyncProjectInfo(undefined)
          const { getUserInfo } = await import('@/lib/sync/gitlab')
          const res = await getUserInfo()
          if (res) {
            setGitlabUserInfo(res)
            setGitlabUsername(res.username)
          }
        }
      } else if (primaryBackupMethod === 'gitea') {
        if (giteaAccessToken) {
          // 获取 Gitea 用户信息
          setGiteaSyncRepoInfo(undefined)
          const { getUserInfo } = await import('@/lib/sync/gitea')
          const res = await getUserInfo()
          if (res) {
            setGiteaUserInfo(res)
            setGiteaUsername(res.username)
          }
        }
      } else {
        setUserInfo(undefined)
        setGiteeUserInfo(undefined)
        setGitlabUserInfo(undefined)
        setGiteaUserInfo(undefined)
      }
    } catch (err) {
      console.error('Failed to get user info:', err)
    }
  }
  
  // 根据主备份方式获取正确的头像地址
  const getAvatarUrl = () => {
    switch (primaryBackupMethod) {
      case 'github':
        if (hasGithubAccount && githubUsername) {
          return `https://github.com/${githubUsername}.png`
        }
        break
      case 'gitee':
        if (hasGiteeAccount && giteeUserInfo?.avatar_url) {
          return giteeUserInfo.avatar_url
        }
        break
      case 'gitlab':
        if (hasGitlabAccount && gitlabUserInfo?.avatar_url) {
          return gitlabUserInfo.avatar_url
        }
        break
      case 'gitea':
        if (hasGiteaAccount && giteaUserInfo?.avatar_url) {
          return giteaUserInfo.avatar_url
        }
        break
      default:
        return ''
    }
    return ''
  }

  const avatarUrl = getAvatarUrl()

  // 获取启用的记录工具
  const enabledTools = recordToolbarConfig
    .filter(item => item.enabled)
    .sort((a, b) => a.order - b.order)

  const getToolIcon = (toolId: string) => {
    switch (toolId) {
      case 'text':
        return <CopySlash className="h-6 w-6" />
      case 'recording':
        return <Mic className="h-6 w-6" />
      case 'scan':
        return <ScanText className="h-6 w-6" />
      case 'image':
        return <ImagePlus className="h-6 w-6" />
      case 'link':
        return <Link className="h-6 w-6" />
      case 'file':
        return <FileText className="h-6 w-6" />
      default:
        return null
    }
  }

  const handleToolClick = (toolId: string) => {
    // 发射工具快捷键事件
    emitter.emit(`toolbar-shortcut-${toolId}`)
  }
    
  // 底部导航菜单项
  const items = [
    {
      title: t('navigation.chat'),
      url: "/mobile/chat",
      icon: MessageSquare,
    },
    {
      title: t('navigation.record'),
      url: "/mobile/record",
      icon: Highlighter,
    },
    {
      title: t('navigation.quickRecord'),
      url: "#quick-record",
      icon: Plus,
      isQuickRecord: true,
    },
    {
      title: t('navigation.write'),
      url: "/mobile/writing",
      icon: SquarePen,
    },
    {
      title: t('navigation.setting'),
      url: "/mobile/setting",
      icon: Settings,
    },
  ]

  // 处理导航点击事件
  async function menuHandler(item: typeof items[0]) {
    if (item.isQuickRecord) {
      // 快捷记录按钮：打开浮动弹窗
      setQuickRecordOpen(!quickRecordOpen)
      return
    }
    
    if (pathname === '/core/article' && item.url === '/core/article') {
      toggleFileSidebar()
    } else {
      router.push(item.url)
    }
    const store = await Store.load('store.json')
    store.set('currentPage', item.url)
  }

  useEffect(() => {
    if (accessToken || giteeAccessToken || gitlabAccessToken || giteaAccessToken) {
      handleGetUserInfo()
    }
  }, [accessToken, giteeAccessToken, gitlabAccessToken, giteaAccessToken, primaryBackupMethod])

  return (
    <div className="w-full border-t bg-background h-14 relative">
      <div className="flex h-full items-center justify-around">
        {items.map((item, index) => {
          // 快捷记录按钮
          if (item.isQuickRecord) {
            return (
              <QuickRecordNavButton
                key={index}
                onClick={() => setQuickRecordOpen(!quickRecordOpen)}
              />
            )
          }
          
          // 头像按钮（最后一项且有头像）
          const isAvatarButton = index === items.length - 1 && showAvatar && avatarUrl
          if (isAvatarButton) {
            return (
              <AvatarNavButton
                key={index}
                item={item}
                isActive={pathname === item.url}
                avatarUrl={avatarUrl}
                onClick={() => menuHandler(item)}
              />
            )
          }
          
          // 普通按钮
          return (
            <NormalNavButton
              key={index}
              item={item}
              isActive={pathname === item.url}
              onClick={() => menuHandler(item)}
            />
          )
        })}
      </div>
      
      {/* 快捷记录抽屉 */}
      <Drawer open={quickRecordOpen} onOpenChange={setQuickRecordOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('navigation.quickRecord')}</DrawerTitle>
          </DrawerHeader>
          
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4">
              {enabledTools.map((tool) => (
                <DrawerClose asChild key={tool.id}>
                  <button
                    className="flex flex-col items-center justify-center p-6 rounded-xl border-2 hover:bg-accent hover:border-primary transition-all duration-200 cursor-pointer group active:scale-95"
                    onClick={() => handleToolClick(tool.id)}
                  >
                    <div className="mb-3 text-primary group-hover:scale-110 transition-transform duration-200">
                      {getToolIcon(tool.id)}
                    </div>
                    <span className="text-sm font-medium text-center text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                      {t(`record.mark.type.${tool.id}`)}
                    </span>
                  </button>
                </DrawerClose>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
