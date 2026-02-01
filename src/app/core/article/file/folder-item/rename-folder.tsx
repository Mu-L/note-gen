import { ContextMenuItem, ContextMenuShortcut } from "@/components/ui/enhanced-context-menu";
import { Kbd } from "@/components/ui/kbd";
import useArticleStore, { DirTree } from "@/stores/article";
import { useTranslations } from "next-intl";
import { computedParentPath, getCurrentFolder } from "@/lib/path";
import { cloneDeep } from "lodash-es";
import { FolderInput } from "lucide-react";
import { platform } from "@tauri-apps/plugin-os";
import { useEffect, useState } from "react";

interface RenameFolderProps {
  item: DirTree;
  onStartRename: () => void;
}

export function RenameFolder({ item, onStartRename }: RenameFolderProps) {
  const t = useTranslations('article.file');
  const { fileTree, setFileTree } = useArticleStore();
  const path = computedParentPath(item);
  const [renameKey, setRenameKey] = useState('F2');

  useEffect(() => {
    try {
      const p = platform();
      setRenameKey(p === 'macos' ? 'Enter' : 'F2');
    } catch {
      setRenameKey('F2');
    }
  }, []);

  function handleStartRename() {
    const cacheTree = cloneDeep(fileTree);
    const currentFolder = getCurrentFolder(path, cacheTree);
    const parentFolder = currentFolder?.parent;

    if (parentFolder && parentFolder.children) {
      const folderIndex = parentFolder?.children?.findIndex(folder => folder.name === item.name);
      if (folderIndex !== undefined && folderIndex !== -1) {
        parentFolder.children[folderIndex].isEditing = true;
      }
    } else {
      const folderIndex = cacheTree.findIndex(folder => folder.name === item.name);
      cacheTree[folderIndex].isEditing = true;
    }

    setFileTree(cacheTree);
    onStartRename();
  }

  return (
    <ContextMenuItem inset onClick={handleStartRename} menuType="file">
      <FolderInput className="mr-2 h-4 w-4" />
      {t('context.rename')}
      <ContextMenuShortcut menuType="file">
        <Kbd>{renameKey}</Kbd>
      </ContextMenuShortcut>
    </ContextMenuItem>
  );
}
