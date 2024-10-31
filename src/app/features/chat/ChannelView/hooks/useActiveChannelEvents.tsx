import { useEffect, useState } from 'react'

import {
  Channel,
  ChatMessage,
  ChatEvent,
  ChatClient,
  ChannelMembership,
} from 'app/features/chat/types'
import { isDate } from 'utilities/dates'

type Props = {
  chatClient: ChatClient
  channel: Channel | null
  isCloseToBottom: boolean
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  forceUpdate: () => void
}

export const useActiveChannelEvents = (props: Props) => {
  const {
    chatClient,
    channel,
    isCloseToBottom,
    setMessages,
    forceUpdate,
  } = props

  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)

  const getPrivateChatFriend = (): ChannelMembership | undefined => {
    if (channel && !channel.data.isGroup) {
      const friend = Object.values(channel.state.members).find(
        member => member.user.id !== chatClient.user.id,
      )
      return friend
    }
  }

  const handleSetUnreadCount = (message: ChatMessage) => {
    if (!channel) return

    const isMessageOwner = message.user.id === chatClient.user.id
    if (!isCloseToBottom) {
      const unreadCount = channel.countUnread()
      setUnreadMessagesCount(unreadCount)
    } else if (unreadMessagesCount && isCloseToBottom && !isMessageOwner) {
      setUnreadMessagesCount(unreadMessagesCount + 1)
    } else if (isMessageOwner) {
      setUnreadMessagesCount(0)
    }
  }

  const handleNewMessageReceived = (event: ChatEvent) => {
    if (!event.message) return null

    const { created_at } = event.message
    const createdAtDate = isDate(created_at) ? created_at : new Date(created_at)
    const newMessage: ChatMessage = {
      ...event.message,
      created_at: createdAtDate,
    }

    handleSetUnreadCount(event.message)
    setMessages(prevMessages => [...prevMessages, newMessage])
  }

  const handleMessageUpdated = (event: ChatEvent) => {
    const updatedMessage = event.message
    if (updatedMessage) {
      setMessages(prevMessages =>
        prevMessages.map(message =>
          message.id == updatedMessage.id ? updatedMessage : message,
        ),
      )
      forceUpdate()
    }
  }

  const handleUserPresenceChanged = (event: ChatEvent) => {
    if (getPrivateChatFriend()?.user.id === event.user?.id) {
      forceUpdate()
    }
  }

  useEffect(() => {
    const messageNewListener = channel?.on(
      'message.new',
      handleNewMessageReceived,
    )

    const messageUpdatedListener = channel?.on(
      'message.updated',
      handleMessageUpdated,
    )

    const messageDeletedListener = channel?.on(
      'message.deleted',
      handleMessageUpdated,
    )

    const channelUpdatedListener = channel?.on('channel.updated', forceUpdate)

    const memberUpdatedListener = channel?.on('member.updated', forceUpdate)

    const typingStartListener = channel?.on('typing.start', forceUpdate)

    const typingStopListener = channel?.on('typing.stop', forceUpdate)

    const userPresenceListener = chatClient?.on(
      'user.presence.changed',
      handleUserPresenceChanged,
    )

    return () => {
      messageNewListener?.unsubscribe()
      messageUpdatedListener?.unsubscribe()
      messageDeletedListener?.unsubscribe()
      channelUpdatedListener?.unsubscribe()
      memberUpdatedListener?.unsubscribe()
      typingStartListener?.unsubscribe()
      typingStopListener?.unsubscribe()
      userPresenceListener?.unsubscribe()
    }
  }, [channel, unreadMessagesCount, isCloseToBottom])

  useEffect(() => {
    if (channel) {
      const unreadCount = channel.countUnread()
      setUnreadMessagesCount(unreadCount)
    }
  }, [channel])

  const handleSendTypingEvent = (isInProgress: boolean) => {
    if (isInProgress) {
      channel?.keystroke()
    } else {
      channel?.stopTyping()
    }
  }

  return { unreadMessagesCount, handleSendTypingEvent }
}
