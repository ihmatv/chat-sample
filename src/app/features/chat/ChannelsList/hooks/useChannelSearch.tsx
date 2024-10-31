import { useState, useEffect } from 'react'

import { getActorsByName } from 'app/services/actors'
import { getFriendsByName } from 'app/services/friends'
import {
  ChatClient,
  ChannelType,
  Channel,
  SearchActorResult,
} from 'app/features/chat/types'
import {
  getIsCanHaveConversation,
  getIsNameStartsWithSearchText,
} from 'app/features/chat/ChannelsList/utils'
import {
  isChannel,
  getPrivateChatFriend,
  getIsIndustryProfessionalByRole,
} from 'utilities/chat'

type Props = {
  isUnder16: boolean
  chatClient: ChatClient
  setActiveChannelId: (
    id: string,
    newMockChannelId?: string | null,
    shouldDeleteMockChannel?: boolean,
  ) => void
}

export const useChannelSearch = (props: Props) => {
  const { isUnder16, chatClient, setActiveChannelId } = props

  const [searchText, setSearchText] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchActorsResults, setSearchActorsResults] = useState<
    SearchActorResult[]
  >([])
  // list of group channels and CD channels
  const [searchChannelsResults, setSearchChannelsResults] = useState<Channel[]>(
    [],
  )

  const userUuid = chatClient.user.id
  const isIndustryProfessional = getIsIndustryProfessionalByRole(
    chatClient.user.role,
  )

  const clearState = () => {
    setIsSearching(false)
    setSearchText('')
    setSearchActorsResults([])
    setSearchChannelsResults([])
  }

  useEffect(() => {
    if (searchText) handleSearch()
    else clearState()
  }, [searchText])

  // handle search actors and channels by search text
  const handleSearch = () => {
    setIsSearching(true)
    Promise.all([
      searchActors(),
      searchGroupAndIndustryProfessionalChannels(),
    ]).finally(() => setIsSearching(false))
  }

  // search for actors by searchText
  const searchActors = async () => {
    if (isIndustryProfessional) {
      // search for actors
      const actors = await getActorsByName(searchText)
      setSearchActorsResults(actors)
    } else if (!isUnder16) {
      // search for friends
      const friends = await getFriendsByName({ userUuid, name: searchText })
      setSearchActorsResults(friends)
    }
  }

  const filterWithIndustryProfessionalChannels = (
    searchText: string,
    channels: Channel[],
  ) => {
    return channels.filter(channel => {
      const companion = getPrivateChatFriend(chatClient.user.id, channel)
      const { name, role } = companion.user

      const isNameStartsWithSearchText = getIsNameStartsWithSearchText({
        name,
        searchText,
      })
      return getIsIndustryProfessionalByRole(role) && isNameStartsWithSearchText
    })
  }

  // get private channels by member name where one of the members is Industry professional
  const getIndustryProfessionalChannelsBySearchText = async (
    searchText: string,
  ) => {
    const filter = {
      type: ChannelType.Messaging,
      members: { $in: [userUuid] },
      'member.user.name': { $autocomplete: searchText },
      member_count: { $eq: 2 },
    }
    const sort = { last_message_at: -1 }
    const options = { limit: 3, watch: false }

    const channels = await chatClient.queryChannels(filter, sort, options)
    return filterWithIndustryProfessionalChannels(searchText, channels)
  }

  // get group channels by channel name
  const getGroupChannelsBySearchText = async (searchText: string) => {
    const filter = {
      type: ChannelType.Messaging,
      members: { $in: [userUuid] },
      name: { $autocomplete: searchText },
      isGroup: { $eq: true },
    }
    const sort = { last_message_at: -1 }
    const options = { limit: 3, watch: false }

    return await chatClient.queryChannels(filter, sort, options)
  }

  // set the results of searching group and CD channels
  const searchGroupAndIndustryProfessionalChannels = async () => {
    const industryProfessionalChannels = await getIndustryProfessionalChannelsBySearchText(
      searchText,
    )
    const groupChannels = await getGroupChannelsBySearchText(searchText)

    setSearchChannelsResults([
      ...industryProfessionalChannels,
      ...groupChannels,
    ])
  }

  // check if channel with actor already exist and create a new one if it doesn't
  const onSelectFriendSearchResult = async (result: SearchActorResult) => {
    const filter = {
      type: ChannelType.Messaging,
      members: { $eq: [userUuid, result.userUuid] },
      member_count: { $eq: 2 },
      isGroup: { $exists: false },
    }
    const channels = await chatClient.queryChannels(filter, {})
    // only CD or actor's friends can have a conversation with this actor
    const canHaveConversation = await getIsCanHaveConversation({
      isIndustryProfessional,
      actorId: result.actorId,
    })

    if (!channels.length && canHaveConversation) {
      setActiveChannelId(result.actorId, result.actorId, false)
    } else if (canHaveConversation) {
      setActiveChannelId(channels[0]?.id)
    }
    clearState()
  }

  const onSelectChannelSearchResult = async (result: Channel) => {
    setActiveChannelId(result.id)
    clearState()
  }

  const onSelectSearchResult = async (result: SearchActorResult | Channel) => {
    if (isChannel(result)) {
      onSelectChannelSearchResult(result)
    } else {
      await onSelectFriendSearchResult(result)
    }
  }

  return {
    searchText,
    isSearching,
    searchActorsResults,
    searchChannelsResults,
    setSearchText,
    setIsSearching,
    onSelectSearchResult,
  }
}
