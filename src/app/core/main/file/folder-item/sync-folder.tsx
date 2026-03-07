import { ContextMenuItem } from "@/components/ui/enhanced-context-menu";
import { RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Store } from "@tauri-apps/plugin-store";
import { getFilePathOptions, getWorkspacePath } from "@/lib/workspace";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { uploadFile as uploadGithubFile, getFiles as getGithubFiles } from '@/lib/sync/github';
import { uploadFile as uploadGiteeFile, getFiles as getGiteeFiles } from '@/lib/sync/gitee';
import { uploadFile as uploadGitlabFile, getFiles as getGitlabFiles } from '@/lib/sync/gitlab';
import { uploadFile as uploadGiteaFile, getFiles as getGiteaFiles } from '@/lib/sync/gitea';
import { s3Upload as uploadS3File } from '@/lib/sync/s3';
import { webdavUpload as uploadWebDAVFile } from '@/lib/sync/webdav';
import { RepoNames } from '@/lib/sync/github.types';
import { S3Config, WebDAVConfig } from '@/types/sync';
import { useTranslations } from "next-intl";
import { useState } from "react";
import useArticleStore, { DirTree } from "@/stores/article";
import { computedParentPath } from "@/lib/path";
import { collectMarkdownFiles } from "@/lib/files";

export default function SyncFolder({ item }: { item: DirTree }) {
  const t = useTranslations('article.file')
  const [isSyncing, setIsSyncing] = useState(false)
  const path = computedParentPath(item)

  const { loadFileTree } = useArticleStore()

  // 同步文件夹下的所有 Markdown 文件
  async function handleSyncFolder() {
    if (isSyncing) return;

    // 检查是否真的是目录（防止误将文件当作目录处理）
    if (!item.isDirectory) {
      toast({
        title: '不是目录',
        description: '只能同步目录',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSyncing(true);
    toast({ title: t('context.syncFolderProgress') });
    
    const store = await Store.load('store.json');
    const primaryBackupMethod = await store.get<string>('primaryBackupMethod') || 'github';
    
    // 获取当前文件夹下的所有 Markdown 文件
    const markdownFiles = await collectMarkdownFiles(path);
    
    if (markdownFiles.length === 0) {
      toast({
        title: t('context.syncFolderError'),
        description: '当前文件夹下没有 Markdown 文件',
        variant: 'destructive'
      });
      return;
    }
    
    let successCount = 0;
    let failedCount = 0;
    
    // 批量同步文件
    for (const file of markdownFiles) {
      try {
        const workspace = await getWorkspacePath();
        const pathOptions = await getFilePathOptions(file.path);
        
        let content = '';
        if (workspace.isCustom) {
          content = await readTextFile(pathOptions.path);
        } else {
          content = await readTextFile(pathOptions.path, { baseDir: pathOptions.baseDir });
        }
        
        const base64Content = Buffer.from(content).toString('base64');
        const filePath = file.path.substring(0, file.path.lastIndexOf('/')) || undefined;

        // 检查文件是否已存在，获取 SHA 值
        let existingSha: string | undefined = undefined;

        switch (primaryBackupMethod) {
          case 'github': {
            const existingFiles = await getGithubFiles({
              path: file.path,
              repo: RepoNames.sync
            });
            if (existingFiles && !Array.isArray(existingFiles)) {
              existingSha = existingFiles.sha;
            }
            break;
          }
          case 'gitee': {
            const existingFiles = await getGiteeFiles({
              path: file.path,
              repo: RepoNames.sync
            });
            if (existingFiles && !Array.isArray(existingFiles)) {
              existingSha = existingFiles.sha;
            }
            break;
          }
          case 'gitlab': {
            const existingFiles = await getGitlabFiles({
              path: file.path,
              repo: RepoNames.sync
            });
            if (existingFiles && !Array.isArray(existingFiles)) {
              existingSha = existingFiles.sha;
            }
            break;
          }
          case 's3':
          case 'gitea':
          case 'webdav':
            // S3、WebDAV 和 Gitea 不需要检查 SHA，直接上传（覆盖式）
            break;
        }

        // 根据主要备份方式选择上传函数
        let uploadResult;
        switch (primaryBackupMethod) {
          case 'github':
            uploadResult = await uploadGithubFile({
              file: base64Content,
              filename: file.name,
              repo: RepoNames.sync,
              path: filePath,
              sha: existingSha,
              message: existingSha ? `Update ${file.name} from folder: ${item.name}` : `Sync folder: ${item.name}`
            });
            break;
          case 'gitee':
            uploadResult = await uploadGiteeFile({
              file: base64Content,
              filename: file.name,
              repo: RepoNames.sync,
              path: filePath,
              sha: existingSha,
              message: existingSha ? `Update ${file.name} from folder: ${item.name}` : `Sync folder: ${item.name}`
            });
            break;
          case 'gitlab':
            uploadResult = await uploadGitlabFile({
              file: base64Content,
              filename: file.name,
              repo: RepoNames.sync,
              path: filePath,
              sha: existingSha,
              message: existingSha ? `Update ${file.name} from folder: ${item.name}` : `Sync folder: ${item.name}`
            });
            break;
          case 's3': {
            const s3Config = await store.get<S3Config>('s3SyncConfig');
            if (s3Config) {
              // 直接传入文件路径，s3Upload 内部会处理 pathPrefix
              uploadResult = await uploadS3File(s3Config, file.path, content);
            }
            break;
          }
          case 'webdav': {
            const webdavConfig = await store.get<WebDAVConfig>('webdavSyncConfig');
            if (webdavConfig) {
              // 直接传入文件路径，webdavUpload 内部会处理 pathPrefix
              uploadResult = await uploadWebDAVFile(webdavConfig, file.path, content);
            }
            break;
          }
          case 'gitea': {
            // Gitea 上传
            try {
              const giteaAccessToken = await store.get<string>('giteaAccessToken');
              const giteaUsername = await store.get<string>('giteaUsername');

              if (!giteaAccessToken || !giteaUsername) {
                console.error('[Gitea Sync] 配置缺失 - accessToken:', !!giteaAccessToken, 'username:', !!giteaUsername);
              }

              let giteaSha: string | undefined = undefined;

              // 先尝试获取文件 SHA
              try {
                const existingFiles = await getGiteaFiles({
                  path: file.path,
                  repo: RepoNames.sync
                });
                if (existingFiles && !Array.isArray(existingFiles)) {
                  giteaSha = existingFiles.sha;
                }
              } catch (shaError) {
                console.error('[Gitea Sync] 获取 SHA 失败:', shaError);
              }

              // 无论 SHA 是否存在，都尝试上传
              // 如果文件已存在但没有 SHA，会返回 422 错误
              // 这种情况下，我们尝试使用 PUT 方法（传一个假的 sha 值触发更新逻辑）
              uploadResult = await uploadGiteaFile({
                file: base64Content,
                filename: file.name,
                repo: RepoNames.sync,
                path: filePath,
                sha: giteaSha,
                message: giteaSha ? `Update ${file.name} from folder: ${item.name}` : `Sync folder: ${item.name}`
              });

              // 如果上传失败且没有 SHA，尝试使用 PUT 方法（需要 sha）
              if (!uploadResult && !giteaSha) {
                // 尝试获取现有文件的 SHA
                try {
                  const fileInfo = await getGiteaFiles({
                    path: file.path,
                    repo: RepoNames.sync
                  });
                  if (fileInfo && !Array.isArray(fileInfo)) {
                    giteaSha = fileInfo.sha;
                    // 使用 SHA 重试上传
                    uploadResult = await uploadGiteaFile({
                      file: base64Content,
                      filename: file.name,
                      repo: RepoNames.sync,
                      path: filePath,
                      sha: giteaSha,
                      message: `Update ${file.name} from folder: ${item.name}`
                    });
                  }
                } catch (retryError) {
                  console.error('[Gitea Sync] 重试失败:', retryError);
                }
              }
            } catch (giteaError) {
              console.error('[Gitea Sync] 上传失败:', giteaError);
              throw giteaError;
            }
            break;
          }
        }
        
        if (uploadResult) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error(`同步文件 ${file.path} 失败:`, error);
        failedCount++;
      }
    }
    
    if (failedCount > 0) {
      toast({
        title: t('context.syncFolderSuccess'),
        description: `成功同步 ${successCount} 个文件，失败 ${failedCount} 个`,
        variant: failedCount === markdownFiles.length ? 'destructive' : 'default'
      });
    } else {
      toast({
        title: t('context.syncFolderSuccess'),
        description: `成功同步 ${successCount} 个文件`,
        variant: 'default'
      });
    }
    
    // 刷新文件树以更新同步状态
    loadFileTree();
    setIsSyncing(false);
  }

  return <ContextMenuItem inset disabled={isSyncing || !item.isLocale} onClick={handleSyncFolder} menuType="file">
    {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
    {t('context.syncFolder')}
  </ContextMenuItem>
}