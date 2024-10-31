import React from 'react'
import { differenceWith, isEqual } from 'lodash'

import {
  Channel,
  ChatClient,
  ChatMessage,
  ChatMessageAttachment,
} from 'app/features/chat/types'
import { ChatType, CHAT_MESSAGE_SENT } from 'app/trackingKeys'
import { recordEvent } from 'utilities/tracking'

type Props = {
  chatClient: ChatClient
  channel: Channel | null
  uploadFiles: (
    files: File[],
    channel?: Channel,
  ) => Promise<ChatMessageAttachment[]>
}

export const useMessageCRUD = (props: Props) => {
  const { chatClient, channel, uploadFiles } = props

  const [
    editableMessage,
    setEditableMessage,
  ] = React.useState<null | ChatMessage>(null)

  const defaultEditableData = React.useMemo(
    () => ({
      text: editableMessage?.text,
      attachments:
        editableMessage?.attachments.filter(
          // hide attachments with a url preview
          attachment => !attachment.title_link,
        ) || [],
    }),
    [editableMessage],
  )

  const deleteAttachment = (attachment: ChatMessageAttachment) => {
    if (attachment?.image_url) return channel?.deleteImage(attachment.image_url)
    if (attachment?.asset_url) return channel?.deleteFile(attachment.asset_url)
  }

  const handleDeleteAttachments = async (
    attachments: ChatMessageAttachment[],
  ) => {
    const requests = attachments.map(attachment => deleteAttachment(attachment))
    await Promise.all(requests).catch(() => console.error('can`t delete files'))
  }

  const recordSendMessageEvent = (
    chatClient: ChatClient,
    channel?: Channel | null,
  ) => {
    const eventData = {
      channelId: channel?.id,
      memberId: chatClient.user.id,
      type: channel?.data.isGroup ? ChatType.Group : ChatType.Private,
    }
    if (channel) recordEvent(CHAT_MESSAGE_SENT, eventData)
  }

  const handleCreateMessage = async (text: string, files: File[]) => {
    const attachments = await uploadFiles(files)

    await channel?.sendMessage({
      text,
      attachments,
    })

    recordSendMessageEvent(chatClient, channel)
  }

  const handleCreateMessageForSpecificChannel = async (
    text: string,
    files: File[],
    channel?: Channel,
  ) => {
    const attachments = await uploadFiles(files, channel)

    await channel?.sendMessage({
      text,
      attachments,
    })

    recordSendMessageEvent(chatClient, channel)
  }

  const handleEditMessage = async (
    text: string,
    newFiles: File[],
    oldFiles: ChatMessageAttachment[],
    message: ChatMessage,
  ) => {
    const newUploadedFiles = await uploadFiles(newFiles)
    const deletedOldFiles = differenceWith(
      defaultEditableData.attachments,
      oldFiles,
      isEqual,
    )
    await handleDeleteAttachments(deletedOldFiles)

    await chatClient?.partialUpdateMessage(message.id, {
      set: {
        text,
        attachments: [...oldFiles, ...newUploadedFiles],
        edited: true,
      },
    })
  }

  const handleDeleteMessage = async (message: ChatMessage) => {
    await handleDeleteAttachments(message.attachments)
    await chatClient.deleteMessage(message.id)
  }

  const handleUnpinCurrentMessage = async () => {
    const currentPinnedMessage = channel?.state.pinnedMessages?.[0]
    if (currentPinnedMessage) {
      await chatClient.unpinMessage(currentPinnedMessage.id)
    }
  }

  const handleToggleMessagePinStatus = async (message: ChatMessage) => {
    await handleUnpinCurrentMessage()
    if (!message.pinned) {
      await chatClient.pinMessage(message.id, null)
    }
  }

  return {
    editableMessage,
    defaultEditableData: editableMessage ? defaultEditableData : null,
    setEditableMessage,
    handleCreateMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleToggleMessagePinStatus,
    handleCreateMessageForSpecificChannel,
  }
}
