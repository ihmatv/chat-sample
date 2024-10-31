import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import { withTheme } from '@material-ui/core/styles'

import { LoadingSpinner } from 'app/componentLibrary/loading/LoadingSpinner'
import { ChannelPreview } from 'app/componentLibrary/chat/ChannelPreview/ChannelPreview'
import { MockChannelPreview } from 'app/componentLibrary/chat/ChannelPreview/MockChannelPreview'
import { ChannelSearch } from 'app/componentLibrary/chat/ChannelSearch/ChannelSearch'
import { ChannelsListEmptyState } from 'app/componentLibrary/chat/EmptyState/ChannelsListEmptyState'
import { InfiniteScrollPaginator } from 'app/componentLibrary/InfiniteScrollPaginator'
import { AscDesc, ChannelType, ChatClient } from 'app/features/chat/types'
import { generateMockChannelData } from 'app/features/chat/utils'
import { colors } from 'design/colors'

import { useChannelsPagination } from './hooks/useChannelsPagination'
import { useChannelSearch } from './hooks/useChannelSearch'
import { useChannelEvents } from './hooks/useChannelEvents'

type Props = {
  isUnder16: boolean
  chatClient: ChatClient
  activeChannelId: string | null
  isSidebarOpen: boolean
  isCloseToBottom: boolean
  toggleChatWidth: () => void
  setActiveChannelId: (value: string | null) => void
  mockChannelId?: string
}

export const ChannelsList: React.FC<Props> = props => {
  const {
    isUnder16,
    chatClient,
    activeChannelId,
    isSidebarOpen,
    isCloseToBottom,
    mockChannelId,
    toggleChatWidth,
    setActiveChannelId,
  } = props

  const filters = {
    type: ChannelType.Messaging,
    members: { $in: [chatClient.user.id] },
  }
  const sort = { last_message_at: AscDesc.Desc }

  const [, setChannelUpdateCount] = useState(0)
  const forceUpdate = () => setChannelUpdateCount((count: number) => count + 1)

  const {
    channels,
    hasNextPage,
    isLoading,
    isRefreshing,
    setChannels,
    handleLoadNextPortion,
    handleReloadChannels,
  } = useChannelsPagination({
    chatClient,
    filters,
    sort,
    activeChannelId,
    mockChannelId,
    setActiveChannelId,
  })
  const {
    searchText,
    isSearching,
    searchActorsResults,
    searchChannelsResults,
    setSearchText,
    onSelectSearchResult,
  } = useChannelSearch({
    isUnder16,
    chatClient,
    setActiveChannelId,
  })
  const { addChannelListeners } = useChannelEvents({
    channels,
    chatClient,
    activeChannelId,
    isCloseToBottom,
    setChannels,
    setActiveChannelId,
    handleReloadChannels,
    forceUpdate,
  })

  const handleGetMockChannel = useCallback(async () => {
    if (mockChannelId) return await generateMockChannelData(mockChannelId)
  }, [mockChannelId])

  if (isLoading) {
    return (
      <SpinnerWrapper isSidebarOpen={isSidebarOpen}>
        <LoadingSpinner color={colors.safetyOrange} isLoading={true} />
      </SpinnerWrapper>
    )
  }

  return (
    <Wrapper isSidebarOpen={isSidebarOpen}>
      <ChannelSearch
        userUuid={chatClient.user.id}
        searchText={searchText}
        isSearching={isSearching}
        searchActorsResults={searchActorsResults}
        searchChannelsResults={searchChannelsResults}
        isSidebarOpen={isSidebarOpen}
        toggleChatWidth={toggleChatWidth}
        setSearchText={setSearchText}
        onSelectSearchResult={onSelectSearchResult}
      />
      {!searchText && (
        <ChannelsListWrapper>
          {!channels.length && !isRefreshing && !mockChannelId && (
            <ChannelsListEmptyState isSidebarOpen={isSidebarOpen} />
          )}
          <InfiniteScrollPaginator
            hasMore={hasNextPage}
            loadMore={handleLoadNextPortion}
            isLoading={isRefreshing}
          >
            {mockChannelId && (
              <MockChannelPreview
                key={mockChannelId}
                isActive={mockChannelId === activeChannelId}
                onClick={setActiveChannelId}
                getChannel={handleGetMockChannel}
              />
            )}
            {channels.map(channel => (
              <ChannelPreview
                key={channel.id}
                userUuid={chatClient.user.id}
                channel={channel}
                isActive={channel.id === activeChannelId}
                unreadCount={channel.state.unreadCount}
                lastMessage={channel.lastMessage()}
                onClick={setActiveChannelId}
                onLoad={addChannelListeners}
              />
            ))}
          </InfiniteScrollPaginator>
        </ChannelsListWrapper>
      )}
    </Wrapper>
  )
}

const Wrapper = withTheme(styled.div<{ isSidebarOpen: boolean }>`
  height: 100%;
  width: ${({ theme }) => theme.spacing(177)};
  background: ${colors.white};

  ${({ theme }) => theme.breakpoints.down('sm')} {
    position: absolute;
    width: ${({ theme, isSidebarOpen }) =>
      isSidebarOpen ? theme.spacing(177) : theme.spacing(36)};
    z-index: 99;
  }
  ${({ theme }) => theme.breakpoints.only('xs')} {
    width: ${({ theme, isSidebarOpen }) =>
      isSidebarOpen ? theme.spacing(177) : 0};
  }
  transition: all 0.7s;
`)

const SpinnerWrapper = withTheme(styled.div<{ isSidebarOpen: boolean }>`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  /* 100% minus ChannelSearch block height */
  height: ${({ theme }) => `calc(100% - ${theme.spacing(76)})`};
  width: ${({ theme }) => theme.spacing(177)};
  background: ${colors.white};

  ${({ theme }) => theme.breakpoints.down('sm')} {
    width: ${({ theme, isSidebarOpen }) =>
      isSidebarOpen ? theme.spacing(177) : theme.spacing(36)};
    overflow-x: hidden;
  }
  ${({ theme }) => theme.breakpoints.only('xs')} {
    width: ${({ theme, isSidebarOpen }) =>
      isSidebarOpen ? theme.spacing(177) : 0};
  }
`)

const ChannelsListWrapper = withTheme(styled.div`
  height: ${({ theme }) => `calc(100% - ${theme.spacing(76)})`};
  overflow-y: auto;
  scrollbar-color: ${colors.gray400} transparent;
  scrollbar-width: thin;

  ${({ theme }) => theme.breakpoints.down('sm')} {
    height: ${({ theme }) => `calc(100% - ${theme.spacing(46)})`};
    overflow-x: hidden;
  }
`)
