import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { withTheme } from '@material-ui/core'
import { useHistory } from 'react-router'

import { NoteInput } from 'app/componentLibrary/forms/NoteInput/NoteInput'
import { MessageSeparator } from 'app/componentLibrary/chat/MessagesListItem/MessageSeparator'
import { MockChannelHeader } from 'app/componentLibrary/chat/ChannelHeader/MockChannelHeader'
import { Channel, ChatClient } from 'app/features/chat/types'
import * as routes from 'app/routes'
import { addChannelModerators } from 'app/services/chat'
import {
  generateMockChannelData,
  MockChannelType,
} from 'app/features/chat/utils'
import { colors } from 'design/colors'
import { createPrivateChannel } from 'utilities/chat'

import { useFilesUpload } from './hooks/useFilesUpload'
import { useMessageCRUD } from './hooks/useMessageCRUD'
import { useGroupChannels } from './hooks/useGroupChannels'

type Props = {
  chatClient: ChatClient
  mockChannelId: string
  isSidebarOpen: boolean
  setActiveChannelId: (
    id: string,
    newMockChannelId?: string | null,
    shouldDeleteMockChannel?: boolean,
  ) => void
}

export const MockChannelView = ({
  chatClient,
  mockChannelId,
  isSidebarOpen,
  setActiveChannelId,
}: Props) => {
  const { replace } = useHistory()
  const [channel, setChannel] = useState<MockChannelType | null>(null)

  const { uploadFilesForSpecificChannel } = useFilesUpload({
    channel: (channel as unknown) as Channel,
  })
  const { handleCreateMessageForSpecificChannel } = useMessageCRUD({
    channel: (channel as unknown) as Channel,
    chatClient,
    uploadFiles: uploadFilesForSpecificChannel,
  })
  const { createGroupChannel } = useGroupChannels({
    chatClient,
    channel: null,
    setActiveChannelId,
    addChannelModerators,
  })

  useEffect(() => {
    generateMockChannelData(mockChannelId).then(data => setChannel(data))
  }, [mockChannelId])

  const handleDeleteChannel = () => {
    replace(routes.chat.replace(':channelId?', ''))
  }

  const submitMessage = async ({ text, newFiles }) => {
    if (!Boolean(text || newFiles.length) || !channel?.userUuid) return

    const newChannel = await createPrivateChannel({
      chatClient,
      friendUserUuid: channel?.userUuid,
    })
    await handleCreateMessageForSpecificChannel(text, newFiles, newChannel)
    setActiveChannelId(newChannel.id, null, true)
  }

  return (
    <Wrapper>
      <MockChannelHeader
        chatClient={chatClient}
        channel={channel}
        isSidebarOpen={isSidebarOpen}
        createGroupChannel={createGroupChannel}
        handleDeleteChannel={handleDeleteChannel}
      />
      <MessagesListWrapper>
        <MessageSeparator value="No messages yet" />
      </MessagesListWrapper>
      <MessageInputWrapper>
        <NoteInput
          avatar={chatClient.user.image}
          username={chatClient.user.name}
          placeholder="Start a conversation about projects you're working on, headshots, monologues..."
          onSubmit={submitMessage}
        />
      </MessageInputWrapper>
    </Wrapper>
  )
}

const Wrapper = withTheme(styled.div`
  display: flex;
  flex-direction: column;
  width: ${({ theme }) => `calc(100% - ${theme.spacing(200)})`};
  padding-left: ${({ theme }) => theme.spacing(4)};

  ${({ theme }) => theme.breakpoints.down('sm')} {
    width: ${({ theme }) => `calc(100% - ${theme.spacing(36)})`};
    margin-left: auto;
    overflow: hidden;
  }
  ${({ theme }) => theme.breakpoints.only('xs')} {
    width: 100%;
    margin: 0;
    padding: 0;
  }
`)

const MessagesListWrapper = withTheme(styled.div`
  position: relative;
  flex: 1;
  margin-top: 56px;
  padding-left: ${({ theme }) => theme.spacing(21)};
  padding-right: ${({ theme }) => theme.spacing(2)};
  overflow-y: auto;
  scrollbar-color: ${colors.gray400} transparent;
  scrollbar-width: thin;

  ${({ theme }) => theme.breakpoints.only('xs')} {
    padding: 0;
  }
`)

const MessageInputWrapper = withTheme(styled.div`
  padding-left: ${({ theme }) => theme.spacing(21)};
  background: ${colors.white};
  z-index: 4;

  ${({ theme }) => theme.breakpoints.only('xs')} {
    padding: 0;
  }
`)
