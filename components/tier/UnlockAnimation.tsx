/**
 * UnlockAnimation Component
 * 登录解锁动画组件
 */

'use client'

import { useEffect } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UnlockAnimationProps {
  /** 是否显示动画 */
  show: boolean
  /** 动画结束回调 */
  onComplete?: () => void
  /** 显示的文本 */
  message?: string
  /** 自定义样式类 */
  className?: string
}

/**
 * 解锁动画组件
 * 登录成功后播放简短动画
 */
export function UnlockAnimation({
  show,
  onComplete,
  message = '解锁成功！',
  className,
}: UnlockAnimationProps) {
  useEffect(() => {
    if (!show) {
      return
    }

    const timer = setTimeout(() => {
      onComplete?.()
    }, 2300)

    return () => clearTimeout(timer)
  }, [show, onComplete])

  if (!show) return null

  return (
    <div
      className={cn(
        'bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm',
        className
      )}
    >
      <div className="animate-in fade-in zoom-in-95 flex flex-col items-center gap-4 duration-500">
        {/* 动画图标 */}
        <div className="relative">
          <div className="bg-primary flex h-20 w-20 animate-bounce items-center justify-center rounded-full transition-all duration-500">
            <Check className="text-primary-foreground h-10 w-10" />
          </div>

          {/* 闪光效果 */}
          <Sparkles className="absolute -top-2 -right-2 h-6 w-6 animate-pulse text-yellow-500 transition-all duration-300" />
          <Sparkles className="absolute -bottom-1 -left-3 h-5 w-5 animate-pulse text-yellow-500 transition-all delay-100 duration-300" />
          <Sparkles className="absolute -right-4 bottom-2 h-4 w-4 animate-pulse text-yellow-500 transition-all delay-200 duration-300" />
        </div>

        {/* 文本 */}
        <div className="text-center">
          <p className="text-foreground text-xl font-semibold">{message}</p>
          <p className="text-muted-foreground mt-1 text-sm">更多功能已为您解锁</p>
        </div>
      </div>
    </div>
  )
}

export default UnlockAnimation
