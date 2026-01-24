import { useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AiLogo } from './AiLogo'
import { AI_BRAND_COLORS, AI_DISPLAY_NAMES } from '../lib/constants'
import type { AiType, Message } from '../lib/types'

interface AiCardProps {
  aiType: AiType
  connected: boolean
  messages: Message[]
}

export function AiCard({ aiType, connected, messages }: AiCardProps) {
  const brandColor = AI_BRAND_COLORS[aiType]
  const displayName = AI_DISPLAY_NAMES[aiType] || aiType
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div
      className="flex flex-col h-full rounded-lg bg-white border border-slate-200 overflow-hidden"
      style={{
        boxShadow: `0 1px 3px 0 rgb(0 0 0 / 0.1)`,
      }}
    >
      <div 
        className="flex items-center gap-2 px-3 py-2 border-b border-slate-100"
        style={{ borderBottomColor: `${brandColor}20` }}
      >
        <AiLogo aiType={aiType} size={20} />
        <span className="font-medium text-slate-900 text-sm">{displayName}</span>
        <span
          className={clsx(
            'ml-auto w-2 h-2 rounded-full',
            connected ? 'bg-green-500' : 'bg-slate-300'
          )}
        />
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-slate-400 italic">
            {connected ? '等待对话...' : '未连接'}
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                'text-sm rounded-lg px-3 py-2',
                msg.role === 'user'
                  ? 'bg-slate-100 text-slate-800 ml-6'
                  : 'bg-slate-50 text-slate-700 mr-2'
              )}
            >
              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              ) : (
                <div className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
