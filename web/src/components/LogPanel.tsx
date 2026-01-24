import { clsx } from 'clsx'
import type { LogEntry } from '../lib/types'

interface LogPanelProps {
  logs: LogEntry[]
  onClear: () => void
}

export function LogPanel({ logs, onClear }: LogPanelProps) {
  return (
    <div className="flex flex-col border-t border-slate-200">
      <div className="px-3 py-2 bg-slate-50 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">活动日志</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">{logs.length} 条</span>
          {logs.length > 0 && (
            <button
              onClick={onClear}
              className="text-[10px] text-slate-500 hover:text-slate-700 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-colors"
              title="清除日志"
            >
              清除
            </button>
          )}
        </div>
      </div>
      <div className="h-32 overflow-y-auto p-2 space-y-1">
        {logs.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">暂无活动</p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={clsx(
                'text-[11px] px-2 py-1 rounded',
                log.type === 'success' && 'bg-green-50 text-green-700',
                log.type === 'error' && 'bg-red-50 text-red-700',
                log.type === 'warning' && 'bg-yellow-50 text-yellow-700',
                log.type === 'info' && 'bg-slate-50 text-slate-600'
              )}
            >
              <span className="opacity-50 mr-1.5 font-mono">
                {log.timestamp.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
