import { decodeBase64ToString, getFiles } from '@/lib/github'
import { GithubContent, RepoNames } from '@/lib/github.types'
import { BaseDirectory, DirEntry, exists, mkdir, readDir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { Store } from '@tauri-apps/plugin-store'
import { cloneDeep } from 'lodash-es'
import { create } from 'zustand'

export interface Article {
  article: string
  path: string
}

interface NoteState {
  loading: boolean
  setLoading: (loading: boolean) => void

  activeFilePath: string 
  setActiveFilePath: (name: string) => void

  html2md: boolean
  initHtml2md: () => Promise<void>
  setHtml2md: (html2md: boolean) => Promise<void>

  fileTree: DirTree[]
  fileTreeLoading: boolean
  setFileTree: (tree: DirTree[]) => void
  loadFileTree: () => Promise<void>
  loadCollapsibleFiles: (folderName: string) => Promise<void>
  newFolder: () => void
  newFile: () => void
  newFileOnFolder: (path: string) => void

  collapsibleList: string[]
  initCollapsibleList: () => Promise<void>
  setCollapsibleList: (name: string, value: boolean) => Promise<void>

  currentArticle: string
  readArticle: (path: string, sha?: string, isLocale?: boolean) => Promise<void>
  setCurrentArticle: (content: string) => void
  saveCurrentArticle: (content: string) => Promise<void>

  allArticle: Article[]
  loadAllArticle: () => Promise<void>
}

export interface DirTree extends DirEntry {
  children?: DirTree[]
  parent?: DirTree
  sha?: string
  isEditing?: boolean
  isLocale: boolean
}

const useArticleStore = create<NoteState>((set, get) => ({
  loading: false,
  setLoading: (loading: boolean) => { set({ loading }) },

  activeFilePath: '',
  setActiveFilePath: async (path: string) => {
    set({ activeFilePath: path })
    const store = await Store.load('store.json');
    await store.set('activeFilePath', path)
  },

  html2md: false,
  initHtml2md: async () => {
    const store = await Store.load('store.json');
    const res = await store.get<boolean>('html2md')
    set({ html2md: res || false })
  },
  setHtml2md: async (html2md: boolean) => {
    set({ html2md })
    const store = await Store.load('store.json');
    store.set('html2md', html2md)
  },

  fileTree: [],
  setFileTree: (tree: DirTree[]) => {
    set({ fileTree: tree })
  },
  fileTreeLoading: false,
  loadFileTree: async () => {
    set({ fileTreeLoading: true })
    set({ fileTree: [] })
    const cacheTree: DirTree[] = []
    const isArticleDir = await exists('article', { baseDir: BaseDirectory.AppData })
    if (!isArticleDir) {
      await mkdir('article', { baseDir: BaseDirectory.AppData })
    }
    const dirs = (await readDir('article', { baseDir: BaseDirectory.AppData })).sort((a, b) => a.name.localeCompare(b.name))
    cacheTree.push(...dirs.filter(file => file.name !== '.DS_Store')
      .map(file => ({ ...file, parent: undefined, isEditing: false, isLocale: true })))
    for (let index = 0; index < cacheTree.length; index++) {
      const dir = cacheTree[index];
      if (dir.isDirectory) {
        const files = await readDir(`article/${dir.name}`, { baseDir: BaseDirectory.AppData });
        dir.children = files.filter(file => file.name !== '.DS_Store').map(file => ({ ...file, parent: dir, isEditing: false, isLocale: true }))
      }
    }
    set({ fileTree: cacheTree })
    const store = await Store.load('store.json');
    const accessToken = await store.get<string>('accessToken')
    if (!accessToken) {
      set({ fileTreeLoading: false })
      return
    }
    const githubFiles = await getFiles({ path: '', repo: RepoNames.article })
    if (githubFiles) {
      githubFiles.forEach((file: GithubContent) => {
        const index = cacheTree.findIndex(item => item.name === file.path.replace('article/', ''))
        if (index !== -1) {
          cacheTree[index].sha = file.sha
        } else {
          cacheTree.push({
            name: file.path,
            isFile: file.type === 'file',
            isSymlink: false,
            parent: undefined,
            isEditing: false,
            isDirectory: file.type === 'dir',
            sha: file.sha,
            isLocale: false,
            children: file.type === 'file' ? undefined : []
          })
        }
      });
      set({ fileTree: cacheTree })
      get().collapsibleList.forEach(async (item) => {
        await get().loadCollapsibleFiles(item)
      })
    }
    set({ fileTreeLoading: false })
  },
  // 加载文件夹内部的 Github 仓库文件
  loadCollapsibleFiles: async (folderName: string) => {
    const cacheTree: DirTree[] = get().fileTree
    const cacheFolderIndex = cacheTree.findIndex(item => item.name === folderName)
    const cacheFolder = cacheTree.find(item => item.name === folderName)
    const githubFiles = await getFiles({ path: folderName, repo: RepoNames.article })
    if (githubFiles && cacheFolder) {
      githubFiles.forEach((file: GithubContent) => {
        const index = cacheFolder.children?.findIndex(item => item.name === file.path.replace(`${folderName}/`, ''))
        if (index !== undefined && index !== -1 && cacheTree[cacheFolderIndex]?.children) {
          cacheTree[cacheFolderIndex].children[index].sha = file.sha
        } else {
          cacheTree[cacheFolderIndex].children?.push({
            name: file.path.replace(`${folderName}/`, ''),
            isFile: file.type === 'file',
            isSymlink: false,
            parent: cacheTree[cacheFolderIndex],
            isEditing: false,
            isDirectory: file.type === 'dir',
            sha: file.sha,
            isLocale: false,
            children: file.type === 'file' ? undefined : []
          })
        }
      });
      set({ fileTree: cacheTree })
    }
  },
  newFolder: async () => {
    const newDir: DirTree = {
      name: '',
      isFile: false,
      isSymlink: false,
      parent: undefined,
      isEditing: true,
      isDirectory: true,
      isLocale: true,
      children: []
    }
    const fileTree = get().fileTree
    fileTree.unshift(newDir)
    set({ fileTree })
  },
  newFile: async () => {
    // 判断 activeFilePath 是否存在 parent
    if (get().activeFilePath.includes('/')) {
      const dirPath = get().activeFilePath.split('/')[0]
      const dirIndex = get().fileTree.findIndex(item => item.name === dirPath)
      if (dirIndex!== undefined && dirIndex!== -1) {
        const fileTree = get().fileTree
        fileTree[dirIndex].isEditing = true
        const newFile: DirTree = {
          name: '',
          isFile: true,
          isSymlink: false,
          parent: fileTree[dirIndex],
          isEditing: true,
          isDirectory: false,
          isLocale: true,
        }
        fileTree[dirIndex].children?.unshift(newFile)
        set({ fileTree })
      }
    } else {
      // 不存在 parent，直接在根目录下创建
      const newFile: DirTree = {
        name: '',
        isFile: true,
        isSymlink: false,
        parent: undefined,
        isEditing: true,
        isDirectory: false,
        isLocale: true,
      }
      const fileTree = get().fileTree
      fileTree.unshift(newFile)
      set({ fileTree })
    }
  },

  newFileOnFolder: async (path: string) => {
    const dirIndex = get().fileTree.findIndex(item => item.name === path)
    if (dirIndex!== undefined && dirIndex!== -1) {
      const fileTree = get().fileTree
      fileTree[dirIndex].isEditing = true
      const newFile: DirTree = {
        name: '',
        isFile: true,
        isSymlink: false,
        parent: fileTree[dirIndex],
        isEditing: true,
        isDirectory: false,
        isLocale: true,
      }
      fileTree[dirIndex].children?.unshift(newFile)
      console.log(newFile);
      set({ fileTree })
      set({ collapsibleList: [...get().collapsibleList, path]})
      console.log(fileTree);
    }
  },

  collapsibleList: [],
  initCollapsibleList: async () => {
    const store = await Store.load('store.json');
    const res = await store.get<string[]>('collapsibleList')
    const activeFilePath = await store.get<string>('activeFilePath')
    if (activeFilePath) {
      set({ activeFilePath })
      get().readArticle(activeFilePath)
    }
    set({ collapsibleList: res || [] })
  },
  setCollapsibleList: async (name: string, value: boolean) => {
    const collapsibleList = get().collapsibleList
    if (value) {
      collapsibleList.push(name)
    } else {
      collapsibleList.splice(collapsibleList.indexOf(name), 1)
    }
    const store = await Store.load('store.json');
    await store.set('collapsibleList', collapsibleList)
    set({ collapsibleList })
  },

  currentArticle: '',
  readArticle: async (path: string, sha?: string, isLocale = true) => {
    if (!path) return
    if (isLocale) {
      let res = ''
      try {
        res = await readTextFile(`article/${path}`, { baseDir: BaseDirectory.AppData })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        try{
          res = decodeBase64ToString(await getFiles({ path, repo: RepoNames.article }))
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
        }
      }
      set({ currentArticle: res })
    } else {
      const res = await getFiles({ path, repo: RepoNames.article })
      set({ currentArticle: decodeBase64ToString(res.content) })
    }
  },

  setCurrentArticle: (content: string) => {
    set({ currentArticle: content })
  },
  saveCurrentArticle: async (content: string) => {
    if (content) {
      const path = get().activeFilePath
      const isLocale = await exists(`article/${path}`, { baseDir: BaseDirectory.AppData })
      if (path.includes('/')) {
        const dirPath = path.split('/')[0]
        if (!await exists(`article/${dirPath}`, { baseDir: BaseDirectory.AppData })) {
          await mkdir(`article/${dirPath}`, { baseDir: BaseDirectory.AppData })
        } 
      }
      await writeTextFile(`article/${path}`, content, { baseDir: BaseDirectory.AppData })
      if (!isLocale) {
        const cacheTree = cloneDeep(get().fileTree)
        if (path.includes('/')) {
          const dirPath = path.split('/')[0]
          const dirIndex = get().fileTree.findIndex(item => item.name === dirPath)
          const fileIndex = get().fileTree[dirIndex].children?.findIndex(item => item.name === path.split('/')[1])
          if (fileIndex !== undefined && fileIndex !== -1) {
            const file = get().fileTree[dirIndex].children?.[fileIndex]
            if (file) {
              file.isLocale = true
              cacheTree[dirIndex]?.children?.splice(fileIndex, 1, file)
            }
          }
        } else {
          const index = get().fileTree.findIndex(item => item.name === path)
          cacheTree[index].isLocale = true
        }
        set({ fileTree: cacheTree })
      }
    }
  },

  allArticle: [],
  loadAllArticle: async () => {
    const res = await readDir('article', { baseDir: BaseDirectory.AppData })
    const allArticle = res.filter(file => file.isFile && file.name !== '.DS_Store').map(file => ({ article: '', path: file.name }))
    for (let index = 0; index < allArticle.length; index += 1) {
      const file = allArticle[index];
      const article = await readTextFile(`article/${file.path}`, { baseDir: BaseDirectory.AppData })
      allArticle[index].article = article
    }
    set({ allArticle })
  }
}))

export default useArticleStore