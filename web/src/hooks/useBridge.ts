import { useState, useEffect, useCallback } from 'react'
import { bridge } from '../lib/bridge'
import type { AiType } from '../lib/types'

interface UseBridgeOptions {
  onStatusUpdate?: (aiType: AiType, connected: boolean) => void
  onResponseCaptured?: (aiType: AiType, content: string) => void
  onSendResult?: (aiType: AiType, success: boolean, error?: string) => void
  onError?: (error: string) => void
}

export function useBridge(options: UseBridgeOptions = {}) {
  const [isConnected, setIsConnected] = useState(bridge.isConnected)
  const [isPaired, setIsPaired] = useState(bridge.isPaired)
  const [pairingCode, setPairingCode] = useState<string | null>(null)

  useEffect(() => {
    bridge.setCallbacks({
      onStatusUpdate: options.onStatusUpdate,
      onResponseCaptured: options.onResponseCaptured,
      onSendResult: options.onSendResult,
      onError: (error) => {
        options.onError?.(error)
        setIsConnected(false)
        if (error.includes('配对已失效') || error.includes('Unauthorized')) {
          setIsPaired(false)
        }
      },
    })

    if (bridge.isInternalApp && !bridge.isConnected) {
      bridge.connect().then(success => {
        setIsConnected(success)
        setIsPaired(bridge.isPaired)
      })
    }
  }, [options])

  const connect = useCallback(async (extensionId?: string) => {
    if (extensionId) {
      bridge.setExtensionId(extensionId)
    }
    const success = await bridge.connect()
    setIsConnected(success)
    return success
  }, [])

  const disconnect = useCallback(() => {
    bridge.disconnect()
    setIsConnected(false)
  }, [])

  const requestPairingCode = useCallback(async () => {
    try {
      const code = await bridge.requestPairingCode()
      setPairingCode(code)
      return code
    } catch (err) {
      options.onError?.(err instanceof Error ? err.message : String(err))
      return null
    }
  }, [options])

  const confirmPairing = useCallback(async (code: string) => {
    try {
      const success = await bridge.confirmPairing(code)
      setIsPaired(success)
      if (success) {
        setPairingCode(null)
      }
      return success
    } catch (err) {
      options.onError?.(err instanceof Error ? err.message : String(err))
      return false
    }
  }, [options])

  const sendMessage = useCallback(async (aiType: AiType, message: string) => {
    try {
      return await bridge.sendMessage(aiType, message)
    } catch (err) {
      options.onError?.(err instanceof Error ? err.message : String(err))
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }, [options])

  const getResponse = useCallback(async (aiType: AiType) => {
    try {
      return await bridge.getResponse(aiType)
    } catch (err) {
      options.onError?.(err instanceof Error ? err.message : String(err))
      return null
    }
  }, [options])

  const getStatus = useCallback(async () => {
    try {
      return await bridge.getStatus()
    } catch (err) {
      options.onError?.(err instanceof Error ? err.message : String(err))
      return null
    }
  }, [options])

  const newConversation = useCallback(async (aiTypes: AiType[]) => {
    try {
      return await bridge.newConversation(aiTypes)
    } catch (err) {
      options.onError?.(err instanceof Error ? err.message : String(err))
      return null
    }
  }, [options])

  return {
    isConnected,
    isPaired,
    pairingCode,
    connect,
    disconnect,
    requestPairingCode,
    confirmPairing,
    sendMessage,
    getResponse,
    getStatus,
    newConversation,
  }
}
