import React, { useEffect, useState, useCallback } from 'react'
import styled from 'styled-components'
import { withTheme, Checkbox } from '@material-ui/core'

import { NoteInput } from 'app/componentLibrary/forms/NoteInput/NoteInput'
import { ChannelHeader } from 'app/componentLibrary/chat/ChannelHeader/ChannelHeader'
import { MessagesListItem } from 'app/componentLibrary/chat/MessagesListItem/MessagesListItem'
import { Avatar } from 'app/componentLibrary/ctas/Avatar/Avatar'
import { ArrowSquareDownIcon } from 'app/componentLibrary/icons/ArrowSquareDownIcon'
import {
  ChatClient,
  ChatMessage,
  MemberRole,
  UserRole,
} from 'app/features/chat/types'
import { InfiniteScrollPaginator } from 'app/componentLibrary/InfiniteScrollPaginator'
import { LoadingSpinner } from 'app/componentLibrary/loading/LoadingSpinner'
import { OnSubmitProps } from 'app/componentLibrary/forms/NoteInput/types'
import { getFriendsByName } from 'app/services/friends'
import { TypingIndicator } from 'app/componentLibrary/chat/TypingIndicator'
import { useConfirmationDialog } from 'app/componentLibrary/modals/ConfirmationDialog/useConfirmationDialog'
import { ConfirmationDialogVariant } from 'app/componentLibrary/modals/ConfirmationDialog/types'
import { ConfirmationDialog } from 'app/componentLibrary/modals/ConfirmationDialog/ConfirmationDialog'
import { IconEmptyState } from 'app/componentLibrary/ctas/IconEmptyState'
import { SkullIcon } from 'app/componentLibrary/icons'
import {
  addChannelModerators,
  demoteChannelModerators,
  updateUserChannelRole,
} from 'app/services/chat'
import { colors } from 'design/colors'
import { borderRadiusLight } from 'design/spacing'
import { typographies } from 'design/typography'
import {
  getIsIndustryProfessionalByRole,
  getPrivateChatFriend,
} from 'utilities/chat'

import { useActiveChannel } from './hooks/useActiveChannel'
import { useMessagesPagination } from './hooks/useMessagesPagination'
import { useMessagesScrollLogic } from './hooks/useMessagesScrollLogic'
import { useActiveChannelEvents } from './hooks/useActiveChannelEvents'
import { useFilesUpload } from './hooks/useFilesUpload'
import { useMessageCRUD } from './hooks/useMessageCRUD'
import { useGroupChannels } from './hooks/useGroupChannels'
import {
  getChatCompanionReadableRole,
  getIsChannelEnabledForActors,
  getIsChannelEnabledForU16,
  processMessageSeparators,
} from './utils'

type Props = {
  isUnder16: boolean
  chatClient: ChatClient
  isSidebarOpen: boolean
  activeChannelId: string | null
  setActiveChannelId: (value: string | null) => void
  setIsCloseToBottom: (value: boolean) => void
}

export const ChannelView: React.FC<Props> = props => {
  const {
    isUnder16,
    chatClient,
    isSidebarOpen,
    activeChannelId,
    setActiveChannelId,
    setIsCloseToBottom,
  } = props

  const [updateCount, setChannelUpdateCount] = useState(0)
  const forceUpdate = () => setChannelUpdateCount((count: number) => count + 1)

  const { activeChannel, isLoading: isActiveChannelLoading } = useActiveChannel(
    {
      activeChannelId,
      chatClient,
    },
  )
  const {
    messages,
    hasNextPage,
    isLoading: isMessagesLoading,
    handleLoadNextPortion,
    setMessages,
  } = useMessagesPagination({
    channel: activeChannel,
    updateCount,
    isChannelLoading: isActiveChannelLoading,
  })
  const {
    listRef,
    isSearchingPinnedMessage,
    onScroll,
    scrollToBottom,
    closeToBottom,
    scrollToPinnedMessage,
  } = useMessagesScrollLogic({
    messages,
    chatClient,
    activeChannelId,
  })
  const { uploadFiles } = useFilesUpload({ channel: activeChannel })
  const { unreadMessagesCount, handleSendTypingEvent } = useActiveChannelEvents(
    {
      chatClient,
      channel: activeChannel,
      setMessages,
      forceUpdate,
      isCloseToBottom: closeToBottom,
    },
  )
  const {
    editableMessage,
    defaultEditableData,
    setEditableMessage,
    handleCreateMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleToggleMessagePinStatus,
  } = useMessageCRUD({ channel: activeChannel, chatClient, uploadFiles })
  const {
    createGroupChannel,
    updateGroupChannel,
    handleDeleteChannel,
    handleLeaveChannel,
  } = useGroupChannels({
    chatClient,
    channel: activeChannel,
    setActiveChannelId,
    addChannelModerators,
  })
  const {
    isDialogOpen,
    dialogData,
    openDialog,
    closeDialog,
  } = useConfirmationDialog()

  useEffect(() => {
    if (activeChannel && closeToBottom && !document.hidden) {
      activeChannel.markRead()
    }
  }, [activeChannel, messages, closeToBottom])

  useEffect(() => {
    setIsCloseToBottom(closeToBottom)
  }, [closeToBottom])

  const handleRemoveMessageConfirmationOpen = (message: ChatMessage) => {
    openDialog({
      entity: message,
      entityName: `message`,
      handleConfirmClick: handleDeleteMessage,
      variant: ConfirmationDialogVariant.Remove,
    })
  }

  const handleLeaveGroupConfirmationOpen = () => {
    openDialog({
      description: 'Leave the chat?',
      handleConfirmClick: handleLeaveChannel,
    })
  }

  const handleDeleteGroupConfirmationOpen = () => {
    openDialog({
      description: 'Delete the chat?',
      handleConfirmClick: handleDeleteChannel,
    })
  }

  const toggleChatAvailabilityForActors = () => {
    if (activeChannel) {
      updateUserChannelRole({
        userId: getPrivateChatFriend(chatClient.user.id, activeChannel).user.id,
        channelId: activeChannel.id,
        role: isUnavailableForActors
          ? MemberRole.Member
          : MemberRole.ChannelMemberDisabledActor,
      })
      updateGroupChannel({
        unavailableForActors: !isUnavailableForActors,
      })
    }
  }

  const handleSubmit = useCallback(
    async ({ text, newFiles, oldFiles }: OnSubmitProps) => {
      const isNewDataAdded = Boolean(text || newFiles.length)
      const isOldFilesRemoved =
        editableMessage && oldFiles.length < editableMessage.attachments.length
      if (!activeChannel || (!isNewDataAdded && !isOldFilesRemoved)) return

      if (editableMessage) {
        await handleEditMessage(text, newFiles, oldFiles, editableMessage)
      } else {
        await handleCreateMessage(text, newFiles)
      }
    },
    [activeChannel, editableMessage, handleEditMessage, handleCreateMessage],
  )

  const isNoChannelSelected =
    !activeChannelId && !activeChannel && !isActiveChannelLoading
  const isChannelLoaded =
    activeChannelId && activeChannel && !isActiveChannelLoading
  const isChannelEnabledForU16 = getIsChannelEnabledForU16({
    userUuid: chatClient.user.id,
    channel: activeChannel,
  })
  const companionReadableRole = getChatCompanionReadableRole({
    userId: chatClient.user.id,
    channel: activeChannel,
  })

  const onClosePreview = React.useCallback(() => setEditableMessage(null), [])

  if (isActiveChannelLoading) {
    return (
      <ChannelSpinnerWrapper>
        <LoadingSpinner color={colors.orange055} isLoading />
      </ChannelSpinnerWrapper>
    )
  }
  if (isNoChannelSelected) {
    return (
      <EmptyStateWrapper>
        <IconEmptyState
          icon={SkullIcon}
          text="You have no conversations to display"
        />
      </EmptyStateWrapper>
    )
  }
  if (isChannelLoaded && isUnder16 && !isChannelEnabledForU16) {
    return (
      <EmptyStateWrapper>
        <IconEmptyState
          icon={SkullIcon}
          text="Chat with actors is disabled for users under 16"
        />
      </EmptyStateWrapper>
    )
  }

  const messagesWithSeparators = processMessageSeparators({
    unreadCount: unreadMessagesCount,
    messages,
  })
  const sendMessageErrorText = editableMessage
    ? 'We have not been able to edit the message. Please try again.'
    : 'We have not been able to send the message. Please try again.'
  // check if channel is disabled for actors
  const isUnavailableForActors = !getIsChannelEnabledForActors({
    userUuid: chatClient.user.id,
    channel: activeChannel,
  })
  // check if we need to disable ability to send message for the actor
  const isInputDisabled =
    chatClient.user.role === UserRole.Actor &&
    activeChannel?.data?.unavailableForActors

  return (
    <Wrapper>
      <ChannelHeader
        chatClient={chatClient}
        channel={activeChannel}
        isSidebarOpen={isSidebarOpen}
        createGroupChannel={createGroupChannel}
        updateGroupChannel={updateGroupChannel}
        handleDeleteChannel={handleDeleteGroupConfirmationOpen}
        handleLeaveChannel={handleLeaveGroupConfirmationOpen}
        addChannelModerators={addChannelModerators}
        demoteChannelModerators={demoteChannelModerators}
        getFriends={getFriendsByName}
        scrollToPinnedMessage={scrollToPinnedMessage}
        handleToggleMessagePinStatus={handleToggleMessagePinStatus}
      />
      <MessagesListWrapper ref={listRef} onScroll={onScroll}>
        <StyledInfiniteScroll
          hasMore={hasNextPage}
          loadMore={handleLoadNextPortion}
          isLoading={isMessagesLoading}
          isReverse
          useWindow={false}
          useCapture
        >
          {messagesWithSeparators.map((message, index) => (
            <MessagesListItem
              key={index}
              message={message}
              userUuid={chatClient.user.id}
              isMyMessage={message.user?.id === chatClient.user.id}
              onEditMessageClick={setEditableMessage}
              handleDeleteMessage={handleRemoveMessageConfirmationOpen}
              handleToggleMessagePinStatus={handleToggleMessagePinStatus}
            />
          ))}
        </StyledInfiniteScroll>
      </MessagesListWrapper>
      {isSearchingPinnedMessage && (
        <MessagesSpinnerWrapper>
          <LoadingSpinner color={colors.orange055} isLoading />
        </MessagesSpinnerWrapper>
      )}
      {activeChannel && (
        <MessageInputWrapper>
          <TypingIndicator
            channel={activeChannel}
            userUuid={chatClient.user.id}
          />
          <NoteInput
            avatar={chatClient.user.image}
            username={chatClient.user.name}
            editableNote={defaultEditableData}
            editNoteFieldTitle={Boolean(editableMessage) ? 'Edit message' : ''}
            placeholder="Start a conversation about projects you're working on, headshots, monologues..."
            disabled={isInputDisabled}
            errorText={sendMessageErrorText}
            onCloseEditNoteField={onClosePreview}
            onFileSelected={scrollToBottom}
            onSubmit={handleSubmit}
            setInProgress={handleSendTypingEvent}
          />
          {/* show this for actors which can't reply on the chat */}
          {isInputDisabled && (
            <ErrorText>{`This ${companionReadableRole} has disabled replies for this conversation`}</ErrorText>
          )}
          {/* show for Industry professionals so they could toggle chat availability for actors */}
          {getIsIndustryProfessionalByRole(chatClient.user.role) && (
            <CheckboxWrapper onClick={toggleChatAvailabilityForActors}>
              <CheckboxLabel>Disable replies</CheckboxLabel>
              <Checkbox color="primary" checked={isUnavailableForActors} />
            </CheckboxWrapper>
          )}
        </MessageInputWrapper>
      )}
      <ScrollToDownWrapper
        closeToBottom={closeToBottom}
        onClick={() => scrollToBottom(true)}
      >
        <Avatar>
          <ArrowSquareDownIcon />
        </Avatar>
      </ScrollToDownWrapper>
      <ConfirmationDialog
        isOpen={isDialogOpen}
        data={dialogData}
        handleCloseClick={closeDialog}
      />
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

const StyledInfiniteScroll = withTheme(styled(InfiniteScrollPaginator)`
  padding-top: ${({ theme }) => theme.spacing(28)};
`)

const ScrollToDownWrapper = withTheme(styled.button<{ closeToBottom: boolean }>`
  color: ${colors.white};
  position: fixed;
  border: none;
  border-radius: ${borderRadiusLight};
  background: transparent;
  right: ${({ theme }) => theme.spacing(8)};
  bottom: ${({ theme }) => theme.spacing(120)};
  opacity: ${({ closeToBottom }) => (closeToBottom ? '0' : '1')};
  transition: all 0.3s;
  cursor: pointer;

  ${({ theme }) => theme.breakpoints.down('sm')} {
    right: ${({ theme }) => theme.spacing(36)};
    bottom: ${({ theme }) => theme.spacing(130)};
  }

  ${({ theme }) => theme.breakpoints.only('xs')} {
    right: ${({ theme }) => theme.spacing(8)};
    bottom: ${({ theme }) => theme.spacing(120)};
  }
`)

const ChannelSpinnerWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`

const MessagesSpinnerWrapper = styled.div`
  position: sticky;
  width: 100%;
  height: 100%;
  z-index: 8;
  left: 0;
  top: 0;
  background: ${colors.white};
`

const CheckboxWrapper = withTheme(styled.div`
  display: flex;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing(8)};
  cursor: pointer;
`)

const CheckboxLabel = withTheme(styled.p`
  ${typographies.chatText};
  margin-right: ${({ theme }) => theme.spacing(4)};
`)

const ErrorText = withTheme(styled.p`
  ${typographies.label};
  color: ${colors.red050};
  margin-top: ${({ theme }) => theme.spacing(2)};
  text-align: center;
`)

const EmptyStateWrapper = styled.div`
  justify-content: center;
  width: 100%;
  height: min-content;
  margin: auto;
  display: flex;
}
`
