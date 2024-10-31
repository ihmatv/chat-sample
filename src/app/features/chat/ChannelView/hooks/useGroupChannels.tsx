import {
  ChannelType,
  GroupChannelDataProps,
  ChatClient,
  Channel,
  AddModeratorsProps,
} from 'app/features/chat/types'
import { ChatType, CHAT_CREATED, CHAT_LEFT } from 'app/trackingKeys'
import { createUniqueId } from 'utilities/createUniqueId'
import { recordEvent } from 'utilities/tracking'

type Props = {
  chatClient: ChatClient
  setActiveChannelId: (value: string | null) => void
  addChannelModerators: (props: AddModeratorsProps) => Promise<void>
  channel?: Channel | null
}

export const useGroupChannels = (props: Props) => {
  const {
    chatClient,
    channel,
    setActiveChannelId,
    addChannelModerators,
  } = props

  const onNewGroupChannelCreated = async (channelId: string) => {
    await addChannelModerators({
      userIds: [chatClient.user.id],
      channelId,
    })
    setActiveChannelId(channelId)
  }

  const createGroupChannel = async (
    data: GroupChannelDataProps,
  ): Promise<void> => {
    const newChannel = chatClient.channel(
      ChannelType.Messaging,
      createUniqueId(),
      {
        ...data,
        members: [chatClient.user.id],
        isGroup: true,
      },
    )

    await newChannel.watch({ presence: true })
    await newChannel.sendMessage({
      text: 'Group chat created',
      attachments: [],
      customType: 'system',
      silent: true,
    })
    recordEvent(CHAT_CREATED, {
      channelId: newChannel.id,
      creatorId: chatClient.user.id,
      type: ChatType.Group,
    })

    await onNewGroupChannelCreated(newChannel.id)
  }

  const updateGroupChannel = async (
    data: GroupChannelDataProps,
  ): Promise<void> => {
    await channel?.updatePartial({ set: { ...data } })
  }

  const handleDeleteChannel = async () => {
    setActiveChannelId(null)
    await channel?.delete()
  }

  const handleLeaveChannel = async () => {
    setActiveChannelId(null)
    await channel?.removeMembers([chatClient.user.id], {
      text: `${chatClient.user.name} left the channel`,
      customType: 'system',
    })

    recordEvent(CHAT_LEFT, {
      channelId: channel?.id,
      memberId: chatClient.user.id,
    })
  }

  return {
    createGroupChannel,
    updateGroupChannel,
    handleDeleteChannel,
    handleLeaveChannel,
  }
}
