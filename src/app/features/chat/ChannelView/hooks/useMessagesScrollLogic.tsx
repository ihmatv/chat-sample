import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
} from 'react'

import { ChatClient, ChatMessage } from 'app/features/chat/types'

import { useMessageListScrollManager } from './useMessageListScrollManager'

type Props = {
  chatClient: ChatClient
  messages: ChatMessage[]
  activeChannelId: string | null
  scrolledUpThreshold?: number
}

export const useMessagesScrollLogic = (props: Props) => {
  const {
    chatClient,
    messages = [],
    activeChannelId,
    scrolledUpThreshold = 200,
  } = props

  const [hasNewMessages, setHasNewMessages] = useState(false)
  const [closeToBottom, setCloseToBottom] = useState(true)
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null)

  const closeToTop = useRef(false)
  const listRef = useRef<HTMLDivElement>(null)

  const clearState = () => {
    setHasNewMessages(false)
    setCloseToBottom(true)
    closeToTop.current = false
  }

  const scrollToTop = useCallback(
    (top: number, smooth = false) => {
      if (!listRef.current?.scrollTo) return

      listRef.current?.scroll({
        top,
        behavior: smooth ? 'smooth' : 'auto',
      })

      setTimeout(() => {
        listRef.current?.scrollTo({
          top,
        })
      }, 200)
    },
    [listRef],
  )

  const scrollToBottom = useCallback(
    (smooth = false) => {
      if (!listRef.current?.scrollTo) return

      listRef.current?.scroll({
        top: listRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
      setHasNewMessages(false)

      setTimeout(() => {
        listRef.current?.scrollTo({
          top: listRef.current.scrollHeight,
        })
      }, 200)
    },
    [listRef],
  )

  useLayoutEffect(() => {
    if (listRef?.current) {
      scrollToBottom()
    }
  }, [listRef])

  useEffect(() => {
    clearState()
  }, [activeChannelId])

  const updateScrollTop = useMessageListScrollManager({
    chatClient,
    messages,
    onScrollBy: scrollBy => listRef.current?.scrollBy({ top: scrollBy }),
    scrollContainerMeasures: () => ({
      offsetHeight: listRef.current?.offsetHeight || 0,
      scrollHeight: listRef.current?.scrollHeight || 0,
    }),
    scrolledUpThreshold,
    scrollToTop,
    scrollToBottom,
    pinnedMessageId,
    setPinnedMessageId,
    showNewMessages: () => setHasNewMessages(true),
  })

  const onScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const element = event.target as HTMLDivElement
      const scrollTop = element.scrollTop

      updateScrollTop(scrollTop)

      const offsetHeight = element.offsetHeight
      const scrollHeight = element.scrollHeight

      const isCloseToBottom =
        scrollHeight - (scrollTop + offsetHeight) < scrolledUpThreshold
      closeToTop.current = scrollTop < scrolledUpThreshold
      setCloseToBottom(isCloseToBottom)

      if (closeToBottom) {
        setHasNewMessages(false)
      }
    },
    [updateScrollTop, closeToTop, closeToBottom, scrolledUpThreshold],
  )

  return {
    listRef,
    hasNewMessages,
    isSearchingPinnedMessage: Boolean(pinnedMessageId),
    closeToBottom,
    onScroll,
    scrollToBottom,
    scrollToPinnedMessage: setPinnedMessageId,
  }
}
