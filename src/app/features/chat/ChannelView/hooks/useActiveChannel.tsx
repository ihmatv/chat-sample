import { useState, useEffect } from 'react'

import { Channel, ChannelType, ChatClient } from 'app/features/chat/types'

type Props = {
  chatClient: ChatClient
  activeChannelId: string | null
}

export const useActiveChannel = (props: Props) => {
  const { activeChannelId, chatClient } = props

  const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearState = () => {
    setIsLoading(false)
    setActiveChannel(null)
  }

  const queryChannelById = async () => {
    setIsLoading(true)
    const filters = {
      type: ChannelType.Messaging,
      id: { $eq: activeChannelId },
      members: { $in: [chatClient.user.id] },
    }
    const channel = await chatClient.queryChannels(filters)

    setActiveChannel(channel[0])
    setIsLoading(false)
  }

  useEffect(() => {
    if (!activeChannelId) clearState()
    else queryChannelById()
  }, [activeChannelId])

  return {
    isLoading,
    activeChannel,
  }
}
