import { startCase, lowerCase } from 'lodash'

import * as routes from 'app/routes'
import { IS_PROD } from 'app/config'
import {
  Channel,
  ChannelType,
  ChatClient,
  UserRole,
} from 'app/features/chat/types'
import { ChatType, CHAT_CREATED } from 'app/trackingKeys'

import { recordEvent } from './tracking'

export const getIsIndustryProfessionalByRole = (role: UserRole) => {
  const industryProfessionalRoles = [
    UserRole.CastingDirector,
    UserRole.Agent,
    UserRole.Producer,
  ]
  return industryProfessionalRoles.includes(role)
}

export const getPrivateChatFriend = (userUuid: string, channel: Channel) => {
  const members = Object.values(channel.state.members)
  const companion = members.filter(member => member.user.id !== userUuid)[0]
  return companion
}

export const triggerChat = (chat: string) => {
  history.replaceState({}, 'Headshot', `${location.pathname}?chat=${chat}`)
  if (IS_PROD) {
    HubSpotConversations.widget.refresh()
    setTimeout(HubSpotConversations.widget.open, 1000)
  }
}

export const getChannelName = (userUuid: string, channel: Channel): string => {
  if (channel.data.isGroup) return channel.data.name

  const companion = getPrivateChatFriend(userUuid, channel)
  return companion.user.name
}

export const getChannelImage = (
  userUuid: string,
  channel: Channel,
): string | null => {
  if (channel.data.isGroup) return channel.data.image

  const companion = getPrivateChatFriend(userUuid, channel)
  return companion.user.image
}

type GetFormattedGenderPronounProps = {
  pronoun: string
  role?: UserRole
}

export const getFormattedGenderPronoun = (
  props: GetFormattedGenderPronounProps,
): string => {
  const { pronoun, role } = props

  const genderPronoun = pronoun
  const formattedGenderPronoun = startCase(lowerCase(genderPronoun))

  if (role === UserRole.CastingDirector) return 'Casting Director'
  if (role === UserRole.Producer) return 'Producer'
  if (role === UserRole.Agent) return 'Agent'
  return genderPronoun
    ? `Actor (${formattedGenderPronoun.replace(' ', '/')})`
    : 'Actor'
}

export const getChannelDescription = (
  userUuid: string,
  channel: Channel,
): string => {
  if (channel.data.isGroup) return channel.data.description

  const companion = getPrivateChatFriend(userUuid, channel)
  const pronoun = companion.user.customGenderPronoun || ''

  return getFormattedGenderPronoun({
    role: companion.user.role,
    pronoun,
  })
}

export const isChannel = (value: unknown): value is Channel =>
  (value as Channel).type === ChannelType.Messaging

type CreatePrivateChannelProps = {
  chatClient: ChatClient
  friendUserUuid: string
}

export const createPrivateChannel = async (
  props: CreatePrivateChannelProps,
): Promise<Channel> => {
  const { friendUserUuid, chatClient } = props

  const newChannel = chatClient.channel(ChannelType.Messaging, {
    members: [chatClient.user.id, friendUserUuid],
    // for private channels with Industry professional
    unavailableForActors: false,
  })
  await newChannel.watch({ presence: true })
  await newChannel.sendMessage({
    text: 'Private chat created',
    attachments: [],
    customType: 'system',
    silent: true,
  })

  recordEvent(CHAT_CREATED, {
    channelId: newChannel.id,
    creatorId: chatClient.user.id,
    type: ChatType.Private,
  })

  return newChannel
}

type SearchPrivateChannelProps = {
  chatClient: ChatClient
  friendUserUuid: string
}

export const searchPrivateChannel = async (
  props: SearchPrivateChannelProps,
) => {
  const { friendUserUuid, chatClient } = props

  const responseChannels = await chatClient.queryChannels({
    members: { $eq: [friendUserUuid, chatClient.user.id] },
    isGroup: { $exists: false },
  })

  return responseChannels[0]
}

type GetChannelRedirectLinkProps = {
  chatClient: ChatClient
  friendId: string
  friendUserUuid: string
}

export const getChannelRedirectLink = async (
  props: GetChannelRedirectLinkProps,
) => {
  const { chatClient, friendId, friendUserUuid } = props

  const channel = await searchPrivateChannel({
    chatClient,
    friendUserUuid,
  })

  return routes.chat.replace(
    ':channelId?',
    channel?.id || `${friendId}?mockChannelId=${friendId}`,
  )
}
