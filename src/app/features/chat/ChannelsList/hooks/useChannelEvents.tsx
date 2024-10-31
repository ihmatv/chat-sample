import { useEffect, useCallback } from 'react'

import {
  Channel,
  ChatClient,
  ChatMessage,
  ChatEvent,
} from 'app/features/chat/types'

type SearchChannelProps = {
  channelId: string
  memberId: string
}

type Props = {
  channels: Channel[]
  chatClient: ChatClient
  activeChannelId: string | null
  isCloseToBottom: boolean
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>
  setActiveChannelId: (id: string | null) => void
  handleReloadChannels: (hard: boolean) => void
  forceUpdate: () => void
}

export const useChannelEvents = (props: Props) => {
  const {
    channels,
    chatClient,
    activeChannelId,
    isCloseToBottom,
    setChannels,
    setActiveChannelId,
    handleReloadChannels,
    forceUpdate,
  } = props

  const searchChannel = async (
    props: SearchChannelProps,
  ): Promise<Channel | null> => {
    const { channelId, memberId } = props

    const responseChannels = await chatClient.queryChannels({
      id: { $eq: channelId },
      members: { $in: [memberId] },
    })
    return responseChannels[0]
  }

  const handleResetChannelsList = async (
    channelId: string,
    filteredChannels: Channel[],
    updatedChannel?: Channel,
  ) => {
    if (updatedChannel) {
      setChannels([updatedChannel, ...filteredChannels])
    } else {
      const channel = await searchChannel({
        channelId,
        memberId: chatClient.user.id,
      })
      if (channel) {
        setChannels(currentChannels =>
          currentChannels[0]?.id === channel.id
            ? currentChannels
            : [channel, ...channels],
        )
      }
    }
  }

  const handleNewMessageReceived = async (event: ChatEvent) => {
    const channelId = String(event.channel_id)
    const filteredChannels = channels.filter(
      channel => channel.id !== channelId,
    )
    const updatedChannel = channels.find(channel => channel.id === channelId)
    handleResetChannelsList(channelId, filteredChannels, updatedChannel)
  }

  const handleChannelCreated = async (event: ChatEvent) => {
    if (event.channel) {
      const newChannel = await searchChannel({
        channelId: event.channel.id,
        memberId: chatClient.user.id,
      })
      if (newChannel) {
        setChannels([newChannel, ...channels])
      }
    }
  }

  const handleChannelDeleted = async (event: ChatEvent) => {
    if (event.channel_id) {
      const isActiveChannelDeleted = activeChannelId === event.channel_id
      const filteredChannels = channels.filter(
        channel => channel.id !== event.channel_id,
      )
      if (isActiveChannelDeleted) {
        setActiveChannelId(null)
      }
      setChannels(filteredChannels)
    }
  }

  useEffect(() => {
    const clientNewMessageListener = chatClient.on(
      'message.new',
      handleNewMessageReceived,
    )

    const clientNewMessageNotificationListener = chatClient.on(
      'notification.message_new',
      handleNewMessageReceived,
    )

    const clientNewChannelListener = chatClient.on(
      'notification.added_to_channel',
      handleChannelCreated,
    )

    const clientChannelUpdatedListener = chatClient.on(
      'channel.updated',
      forceUpdate,
    )

    const userPresenceListener = chatClient?.on(
      'user.presence.changed',
      forceUpdate,
    )

    return () => {
      clientNewMessageListener.unsubscribe()
      clientNewMessageNotificationListener.unsubscribe()
      clientNewChannelListener.unsubscribe()
      clientChannelUpdatedListener.unsubscribe()
      userPresenceListener.unsubscribe()
    }
  }, [channels])

  useEffect(() => {
    const clientChannelListeners = chatClient.on(event => {
      if (
        event.type === 'channel.deleted' ||
        event.type === 'notification.removed_from_channel'
      ) {
        handleChannelDeleted(event)
      }
    })

    return () => {
      clientChannelListeners.unsubscribe()
    }
  }, [activeChannelId, channels])

  const addChannelListeners = useCallback(
    (
      channel: Channel,
      setUnreadCount: (count: number) => void,
      setLastMessage: (message: ChatMessage) => void,
      lastMessage?: ChatMessage,
    ): (() => void) => {
      const messageNewListener = channel.on('message.new', event => {
        if (event.message) {
          const isCurrentChannel = activeChannelId === channel.id

          if ((isCurrentChannel && !isCloseToBottom) || !isCurrentChannel) {
            const unreadCount = channel.countUnread()
            setUnreadCount(unreadCount)
          }
          setLastMessage(event.message)
        }
      })

      const messageUpdatedListener = channel.on('message.updated', event => {
        const messageId = event.message?.id
        if (event.message) {
          if (messageId && messageId === lastMessage?.id) {
            setLastMessage(event.message)
          }
        }
      })

      const messageDeletedListener = channel.on('message.deleted', event => {
        const messageId = event.message?.id
        if (messageId && messageId === lastMessage?.id) {
          handleReloadChannels(false)
        }
      })

      const messageReadListener = channel.on(
        'notification.mark_read',
        event => {
          if (event.cid === channel.cid && event.unread_count !== undefined) {
            forceUpdate()
            setTimeout(() => {
              const unreadCount = channel.countUnread()
              setUnreadCount(unreadCount)
            }, 100)
          }
        },
      )

      const memberDeletedListener = chatClient.on('member.removed', () =>
        cleanup(),
      )

      const cleanup = () => {
        messageNewListener.unsubscribe()
        messageUpdatedListener.unsubscribe()
        messageDeletedListener.unsubscribe()
        messageReadListener.unsubscribe()
        memberDeletedListener.unsubscribe()
      }

      return cleanup
    },
    [activeChannelId, isCloseToBottom],
  )

  return { addChannelListeners }
}
