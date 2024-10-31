import { useMemo, useState, useEffect } from 'react'

import {
  Channel,
  ChannelOptions,
  ChannelFilters,
  ChannelSort,
  ChatClient,
} from 'app/features/chat/types'
import { createErrorToast } from 'app/componentLibrary/toast/Toast'

const CHANNELS_FETCH_LIMIT = 20

type QueryType = 'load' | 'reload'

type Props = {
  filters: ChannelFilters
  sort: ChannelSort
  chatClient: ChatClient
  activeChannelId: string | null
  setActiveChannelId: (id: string) => void
  mockChannelId?: string
  options?: ChannelOptions
}

export const useChannelsPagination = (props: Props) => {
  const {
    activeChannelId,
    chatClient,
    filters,
    sort,
    options,
    mockChannelId,
    setActiveChannelId,
  } = props

  const [channels, setChannels] = useState<Channel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(true)
  const [hasNextPage, setHasNextPage] = useState(true)

  const filterString = useMemo(() => JSON.stringify(filters), [filters])
  const sortString = useMemo(() => JSON.stringify(sort), [sort])

  const constructQueryChannelsOptions = (
    offset: number,
    options?: ChannelOptions,
  ) => ({
    limit: options?.limit ?? CHANNELS_FETCH_LIMIT,
    offset,
    watch: true,
    presence: true,
    ...options,
  })

  const queryChannels = async (hardReload = true, queryType?: QueryType) => {
    if (!chatClient) return

    if (queryType === 'reload' && hardReload) {
      setChannels([])
      setIsLoading(true)
    }

    setIsRefreshing(true)

    const offset = queryType === 'reload' ? 0 : channels.length
    const newOptions = constructQueryChannelsOptions(offset, options)

    try {
      const channelQueryResponse = await chatClient.queryChannels(
        filters,
        sort || {},
        newOptions,
      )

      const newChannels =
        queryType === 'reload'
          ? channelQueryResponse
          : [...channels, ...channelQueryResponse]

      setChannels(newChannels)
      setHasNextPage(channelQueryResponse.length >= newOptions.limit)

      // Set active channel only on load of first page
      if (!offset && hardReload && !activeChannelId && !mockChannelId) {
        setActiveChannelId(newChannels[0]?.id)
      }
    } catch (error) {
      createErrorToast('Failed to load channels')
    }

    setIsLoading(false)
    setIsRefreshing(false)
  }

  const handleReloadChannels = async (hard = true) =>
    await queryChannels(hard, 'reload')

  useEffect(() => {
    handleReloadChannels()
  }, [filterString, sortString])

  return {
    channels,
    hasNextPage,
    isLoading,
    isRefreshing,
    setChannels,
    handleLoadNextPortion: queryChannels,
    handleReloadChannels,
  }
}
