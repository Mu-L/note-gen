import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, LoaderCircle, CheckCircle, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Store } from "@tauri-apps/plugin-store";
import { type SMMSImageHostingSetting } from "@/lib/imageHosting/smms";
import useImageStore from "@/stores/imageHosting";
import { getUserInfo } from "@/lib/imageHosting/smms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OpenBroswer } from "@/components/open-broswer";

const CREATE_TOKEN_URL = 'https://s.ee/user/developers'

export default function SMMSImageHosting() {
  useImageStore()

  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState('')
  const [tokenVisible, setTokenVisible] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  async function init() {
    const store = await Store.load('store.json');
    const imageHostings = await store.get<SMMSImageHostingSetting>('smms')
    if (imageHostings) {
      setToken(imageHostings.token)
    }
  }

  // 设置 token
  async function handleSetToken(token: string) {
    setToken(token)
    const store = await Store.load('store.json');
    await store.set('smms', { token })
    await store.save()
  }

  // 获取用户信息
  async function handleSetUserInfo() {
    setLoading(true)
    setIsConnected(false)
    const user = await getUserInfo()
    setIsConnected(!!user)
    setLoading(false)
  }

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    handleSetUserInfo()
  }, [token])

  const getStatusIcon = () => {
    if (loading) {
      return <LoaderCircle className="size-4 animate-spin text-blue-500" />;
    }
    if (token && isConnected) {
      return <CheckCircle className="size-4 text-green-500" />;
    }
    if (token && !isConnected) {
      return <XCircle className="size-4 text-red-500" />;
    }
    return <XCircle className="size-4 text-gray-500" />;
  };

  const getStatusText = () => {
    if (loading) {
      return '检测中';
    }
    if (token && isConnected) {
      return '已连接';
    }
    if (token && !isConnected) {
      return '连接失败';
    }
    return '未配置';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>S.EE 图床</CardTitle>
            <CardDescription>
              使用 S.EE 上传和管理图片
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 状态显示 */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">连接状态</span>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm">{getStatusText()}</span>
          </div>
        </div>

        {/* Token 配置 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">API Token</label>
          <p className="text-xs text-muted-foreground">请输入 S.EE API Token，现有配置可继续复用。</p>
          <div className="flex items-center gap-2">
            <Input
              className="flex-1"
              type={tokenVisible ? 'text' : 'password'}
              value={token}
              onChange={(e) => handleSetToken(e.target.value)}
              placeholder="输入 S.EE API Token"
            />
            <Button variant="outline" size="icon" onClick={() => setTokenVisible(!tokenVisible)}>
              {tokenVisible ? <Eye /> : <EyeOff />}
            </Button>
          </div>
          <OpenBroswer url={CREATE_TOKEN_URL} title="打开 S.EE 开发者页面" className="text-sm text-blue-500 hover:underline" />
        </div>
      </CardContent>
    </Card>
  )
}
