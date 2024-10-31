import { useState, useEffect } from 'react'
import { isEqual } from 'lodash'

import { Channel, ChatMessage } from 'app/features/chat/types'
import { createErrorToast } from 'app/componentLibrary/toast/Toast'

const MESSAGES_FETCH_LIMIT = 20

type Props = {
  channel: Channel | null
  updateCount: number
  isChannelLoading: boolean
}

export const useMessagesPagination = (props: Props) => {
  const { channel, updateCount, isChannelLoading } = props

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(true)

  const clearState = () => {
    setMessages([])
    setIsLoading(false)
    setHasNextPage(true)
  }

  useEffect(() => {
    clearState()
  }, [channel])

  useEffect(() => {
    if (!isChannelLoading && channel) {
      setMessages([...channel.state.messages])
    }
  }, [isChannelLoading])

  useEffect(() => {
    setTimeout(() => {
      if (channel) {
        setMessages(getFreshMessages)
      }
    })
  }, [channel, updateCount])

  // if there are some diff between current messages list and messages list from channel state
  const getFreshMessages = (messages: ChatMessage[]) => {
    if (channel && !isEqual(channel.state.messages, messages)) {
      return [...channel.state.messages]
    }
    return messages
  }

  const queryMessages = async () => {
    if (!channel) return
    setIsLoading(true)

    try {
      const newState = await channel.query({
        messages: {
          limit: MESSAGES_FETCH_LIMIT,
          id_lt: messages[0]?.id,
        },
      })

      setMessages(currentMessages => [...newState.messages, ...currentMessages])
      setHasNextPage(newState.messages.length >= MESSAGES_FETCH_LIMIT)
    } catch (err) {
      createErrorToast('Failed to load messages')
    }

    setIsLoading(false)
  }

  return {
    messages,
    hasNextPage,
    isLoading,
    handleLoadNextPortion: queryMessages,
    setMessages,
  }
}
