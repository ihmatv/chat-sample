import { useRef, useEffect } from 'react'

import { ChatClient, ChatMessage } from 'app/features/chat/types'

type ContainerMeasures = {
  offsetHeight: number
  scrollHeight: number
}

type Props = {
  chatClient: ChatClient
  messages: ChatMessage[]
  scrolledUpThreshold: number
  pinnedMessageId: string | null
  setPinnedMessageId: (id: string | null) => void
  onScrollBy: (scrollBy: number) => void
  scrollContainerMeasures: () => ContainerMeasures
  scrollToTop: (top: number) => void
  scrollToBottom: () => void
  showNewMessages: () => void
}

export const useMessageListScrollManager = (props: Props) => {
  const {
    chatClient,
    scrolledUpThreshold,
    pinnedMessageId,
    setPinnedMessageId,
    onScrollBy,
    scrollContainerMeasures,
    scrollToTop,
    scrollToBottom,
    showNewMessages,
  } = props

  const measures = useRef<ContainerMeasures>({
    offsetHeight: 0,
    scrollHeight: 0,
  })
  const messages = useRef<ChatMessage[]>()
  const scrollTop = useRef(0)

  useEffect(() => {
    scrollToBottom()
  }, [])

  useEffect(() => {
    const prevMeasures = measures.current
    const prevMessages = messages.current
    const newMessages = props.messages
    const lastNewMessage = newMessages[newMessages.length - 1] || {}
    const lastPrevMessage = prevMessages?.[prevMessages.length - 1]
    const newMeasures = scrollContainerMeasures()

    const wasAtBottom =
      prevMeasures.scrollHeight -
        prevMeasures.offsetHeight -
        scrollTop.current <
      scrolledUpThreshold

    if (typeof prevMessages !== 'undefined') {
      if (prevMessages.length < newMessages.length) {
        // messages added to the top
        if (lastPrevMessage?.id === lastNewMessage.id) {
          const listHeightDelta =
            newMeasures.scrollHeight - prevMeasures.scrollHeight

          onScrollBy(listHeightDelta)
        }
        // messages added to the bottom
        else {
          const isWindowActive = !document.hidden
          const lastMessageIsFromCurrentUser =
            lastNewMessage.user?.id === chatClient.user.id

          if (lastMessageIsFromCurrentUser || (wasAtBottom && isWindowActive)) {
            scrollToBottom()
          } else {
            showNewMessages()
          }
        }
      }
    }

    messages.current = newMessages
    measures.current = newMeasures
  }, [measures, messages, props.messages])

  useEffect(() => {
    if (!pinnedMessageId) return

    const pinnedMessageElement = document.getElementById(pinnedMessageId)
    if (pinnedMessageElement) {
      const pinnedMessageTop = pinnedMessageElement.offsetTop - 50
      scrollToTop(pinnedMessageTop)
      setPinnedMessageId(null)
    } else {
      scrollToTop(0)
    }
  }, [pinnedMessageId, props.messages])

  return (scrollTopValue: number) => {
    scrollTop.current = scrollTopValue
  }
}
