import { useMemo } from 'react'
import { AiCard } from './AiCard'
import { AI_TYPES } from '../lib/constants'
import type { AiType, AiStatuses, Conversations } from '../lib/types'

interface AiGridProps {
  statuses: AiStatuses
  selectedAis: Set<AiType>
  conversations: Conversations
}

function getGridClassName(count: number): string {
  if (count === 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-2'
  if (count <= 4) return 'grid-cols-2'
  if (count <= 6) return 'grid-cols-3'
  return 'grid-cols-4'
}

export function AiGrid({ statuses, selectedAis, conversations }: AiGridProps) {
  const activeAis = useMemo(() => {
    return AI_TYPES.filter(ai => statuses[ai] && selectedAis.has(ai))
  }, [statuses, selectedAis])

  const gridClassName = getGridClassName(activeAis.length)

  if (activeAis.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <p className="text-lg">没有活跃的 AI</p>
          <p className="text-sm mt-1">请在左侧选择已连接的 AI</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex-1 grid ${gridClassName} gap-4 min-h-0`}>
      {activeAis.map((ai) => (
        <AiCard
          key={ai}
          aiType={ai}
          connected={statuses[ai]}
          messages={conversations[ai]}
        />
      ))}
    </div>
  )
}
