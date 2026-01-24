import { useState, useCallback } from 'react'
import { AI_TYPES } from '../lib/constants'
import type { AiType, AiStatuses, AiTabCounts } from '../lib/types'

const initialStatuses: AiStatuses = AI_TYPES.reduce(
  (acc, ai) => ({ ...acc, [ai]: false }),
  {} as AiStatuses
)

const initialTabCounts: AiTabCounts = AI_TYPES.reduce(
  (acc, ai) => ({ ...acc, [ai]: 0 }),
  {} as AiTabCounts
)

export function useAiStatus() {
  const [statuses, setStatuses] = useState<AiStatuses>(initialStatuses)
  const [tabCounts, setTabCounts] = useState<AiTabCounts>(initialTabCounts)

  const updateStatus = useCallback((aiType: AiType, connected: boolean) => {
    setStatuses(prev => ({ ...prev, [aiType]: connected }))
  }, [])

  const refreshStatuses = useCallback(() => {
    setStatuses(initialStatuses)
    setTabCounts(initialTabCounts)
  }, [])

  const replaceStatuses = useCallback((next: AiStatuses, nextTabCounts?: AiTabCounts) => {
    setStatuses(next)
    if (nextTabCounts) {
      setTabCounts(nextTabCounts)
    }
  }, [])

  return {
    statuses,
    tabCounts,
    updateStatus,
    refreshStatuses,
    replaceStatuses,
  }
}
