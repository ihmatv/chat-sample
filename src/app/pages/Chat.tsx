import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useHistory, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { Theme, useMediaQuery } from '@material-ui/core'
import { withTheme } from '@material-ui/core/styles'

import 'stream-chat-react/dist/css/index.css'

import { IconEmptyState } from 'app/componentLibrary/ctas/IconEmptyState'
import { SkullIcon } from 'app/componentLibrary/icons'
import { LoadingSpinner } from 'app/componentLibrary/loading/LoadingSpinner'
import { ChannelsList } from 'app/features/chat/ChannelsList/ChannelsList'
import { ChannelView } from 'app/features/chat/ChannelView/ChannelView'
import { MockChannelView } from 'app/features/chat/ChannelView/MockChannelView'
import { isUnder16 as getIsUnder16 } from 'app/features/legal/GuardianConsentCheckboxField'
import { userStore } from 'app/features/user/store'
import * as routes from 'app/routes'
import { useChatClient } from 'app/providers/ChatProvider/ChatProvider'
import { colors } from 'design/colors'

type ParamsType = {
  channelId: string
  mockChannelId: string
}

export const Chat = () => {
  const { channelId = '' } = useParams<ParamsType>()
  const location = useLocation()

  const params = new URLSearchParams(location.search)
  const mockChannelId = params.get('mockChannelId') || ''

  const { chatClient } = useChatClient()

  const history = useHistory()

  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isCloseToBottom, setIsCloseToBottom] = useState(true)

  const user = userStore.get()
  const isUnder16 = user?.dateOfBirth && getIsUnder16(user.dateOfBirth)
  const isSmallTablets = useMediaQuery((theme: Theme) => {
    return theme.breakpoints.down('sm')
  })

  useEffect(() => {
    if (isSmallTablets) {
      setIsSidebarOpen(false)
    } else {
      setIsSidebarOpen(true)
    }
  }, [isSmallTablets])

  useEffect(() => {
    if (isSmallTablets) {
      setIsSidebarOpen(false)
    }
  }, [channelId, isSmallTablets])

  const toggleChatWidth = () => {
    if (isSmallTablets) {
      setIsSidebarOpen(prevValue => !prevValue)
    }
  }

  const setActiveChannelId = useCallback(
    (
      id: string | null,
      newMockChannelId?: string | null,
      shouldDeleteMockChannel?: boolean,
    ) => {
      const newActiveChannelId = id || ''
      const mockId = newMockChannelId || mockChannelId

      history.replace(
        routes.chat.replace(
          ':channelId?',
          mockId && !shouldDeleteMockChannel
            ? `${newActiveChannelId}?mockChannelId=${mockId}`
            : newActiveChannelId,
        ),
      )
    },
    [history, mockChannelId],
  )

  if (!chatClient) {
    return (
      <Wrapper isCentered>
        <LoadingSpinner color={colors.orange055} isLoading />
      </Wrapper>
    )
  }

  if (chatClient && !chatClient.user) {
    return (
      <Wrapper isCentered>
        <IconEmptyState icon={SkullIcon} text="Chat unavailable" />
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <ChannelsList
        isUnder16={Boolean(isUnder16)}
        chatClient={chatClient}
        activeChannelId={channelId}
        isSidebarOpen={isSidebarOpen}
        isCloseToBottom={isCloseToBottom}
        mockChannelId={mockChannelId}
        toggleChatWidth={toggleChatWidth}
        setActiveChannelId={setActiveChannelId}
      />
      {mockChannelId && mockChannelId === channelId ? (
        <MockChannelView
          mockChannelId={mockChannelId}
          chatClient={chatClient}
          isSidebarOpen={isSidebarOpen}
          setActiveChannelId={setActiveChannelId}
        />
      ) : (
        <ChannelView
          isUnder16={Boolean(isUnder16)}
          chatClient={chatClient}
          isSidebarOpen={isSidebarOpen}
          activeChannelId={channelId}
          setActiveChannelId={setActiveChannelId}
          setIsCloseToBottom={setIsCloseToBottom}
        />
      )}
      {isSidebarOpen && <ChatBackdrop onClick={toggleChatWidth} />}
    </Wrapper>
  )
}

const Wrapper = withTheme(styled.div<{ isCentered: boolean }>`
  display: flex;
  position: relative;
  overflow: hidden;
  /* screen height minus (navbar height + layout paddings) */
  height: calc(100vh - 185px);
  justify-content: ${({ isCentered }) => (isCentered ? 'center' : 'initial')};
  align-items: ${({ isCentered }) => (isCentered ? 'center' : 'initial')};

  ${({ theme }) => theme.breakpoints.only('md')} {
    height: calc(100vh - 201px);
  }
  ${({ theme }) => theme.breakpoints.down('sm')} {
    height: calc(100vh - 137px);
    padding: ${({ theme }) => theme.spacing(0, 4, 28)};
  }
  ${({ theme }) => theme.breakpoints.only('xs')} {
    height: calc(100vh - 210px);
  }
`)

const ChatBackdrop = withTheme(styled.div`
  display: none;
  position: absolute;
  width: 100%;
  height: 100%;
  background: ${colors.black};
  opacity: 0.7;
  top: 89px;
  z-index: 9;

  ${({ theme }) => theme.breakpoints.down('sm')} {
    display: block;
  }
`)
