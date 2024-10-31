import {
  Channel,
  ChatMessage,
  MemberRole,
  UserRole,
} from 'app/features/chat/types'
import {
  getIsIndustryProfessionalByRole,
  getPrivateChatFriend,
} from 'utilities/chat'
import { convertStringToDate } from 'utilities/dates'

const getMessageDateString = (message: ChatMessage): string | undefined => {
  const messageCreationDate = convertStringToDate(message.created_at)
  return messageCreationDate.toDateString()
}

type GetPreviousMessageDateStringProps = {
  isFirstMessage: boolean
  previousMessage: ChatMessage
  messageDate?: string
}

const getPreviousMessageDateString = (
  props: GetPreviousMessageDateStringProps,
) => {
  const { isFirstMessage, previousMessage, messageDate } = props

  let previousMessageDate = messageDate

  if (!isFirstMessage) {
    previousMessageDate = getMessageDateString(previousMessage)
  }
  return previousMessageDate
}

type HandleAddUnreadSeparatorProps = {
  message: ChatMessage
  newMessages: ChatMessage[]
}

const handleAddUnreadSeparator = (props: HandleAddUnreadSeparatorProps) => {
  const { message, newMessages } = props

  newMessages.push({
    customType: 'unreadSeparator',
    date: convertStringToDate(message.created_at),
    id: message.id,
  } as ChatMessage)
}

type GetIfDateSeparatorMustBeShownProps = {
  isFirstMessage: boolean
  newMessages: ChatMessage[]
  messageDate?: string
  previousMessageDate?: string
}

const getIfDateSeparatorMustBeShown = (
  props: GetIfDateSeparatorMustBeShownProps,
) => {
  const {
    isFirstMessage,
    newMessages,
    messageDate,
    previousMessageDate,
  } = props

  // check if separator is already shown
  const previousMessageType = newMessages?.[newMessages.length - 1]?.customType
  const isPrevMessageIsSeparator = [
    'dateSeparator',
    'unreadSeparator',
  ].includes(previousMessageType)
  const showDateSeparator =
    isFirstMessage || messageDate !== previousMessageDate

  // show 'date separator' only for the first message and for messages with different creation dates
  return showDateSeparator && !isPrevMessageIsSeparator
}

type HandleAddDateSeparatorProps = {
  message: ChatMessage
  newMessages: ChatMessage[]
}

const handleAddDateSeparator = (props: HandleAddDateSeparatorProps) => {
  const { message, newMessages } = props

  newMessages.push({
    customType: 'dateSeparator',
    date: convertStringToDate(message.created_at),
    id: message.id,
  } as ChatMessage)
}

type ProcessMessagesProps = {
  messages: ChatMessage[]
  unreadCount: number
}

export const processMessageSeparators = (
  props: ProcessMessagesProps,
): ChatMessage[] => {
  const { unreadCount, messages } = props

  const newMessages: ChatMessage[] = []

  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i]
    const previousMessage = messages[i - 1]

    const messageDate = getMessageDateString(message)
    const previousMessageDate = getPreviousMessageDateString({
      isFirstMessage: i === 0,
      previousMessage,
      messageDate,
    })

    // add Unread separator if needed
    if (messages.length - i === unreadCount) {
      handleAddUnreadSeparator({ message, newMessages })
    }

    // check if we need to add Date separator
    const showDateSeparator = getIfDateSeparatorMustBeShown({
      isFirstMessage: i === 0,
      newMessages,
      messageDate,
      previousMessageDate,
    })

    if (showDateSeparator) {
      handleAddDateSeparator({ message, newMessages })
    }

    newMessages.push(message)
  }
  return newMessages
}

type GetIsChannelEnabledForActorsProps = {
  userUuid: string
  channel: Channel | null
}

export const getIsChannelEnabledForActors = (
  props: GetIsChannelEnabledForActorsProps,
) => {
  const { userUuid, channel } = props

  if (!channel) return false
  const privateChatFriend = getPrivateChatFriend(userUuid, channel)

  const isChannelEnabled = !channel?.data?.unavailableForActors
  const isActorActionsEnabled =
    privateChatFriend?.channel_role !== MemberRole.ChannelMemberDisabledActor

  return isChannelEnabled && isActorActionsEnabled
}

type GetIsChannelEnabledForU16 = {
  userUuid: string
  channel: Channel | null
}

export const getIsChannelEnabledForU16 = (props: GetIsChannelEnabledForU16) => {
  const { userUuid, channel } = props

  if (channel && !channel.data.isGroup) {
    const companion = getPrivateChatFriend(userUuid, channel)
    return getIsIndustryProfessionalByRole(companion.user.role)
  }

  return false
}

type GetChatCompanionReadableRoleProps = {
  userId: string
  channel: Channel | null
}

export const getChatCompanionReadableRole = (
  props: GetChatCompanionReadableRoleProps,
) => {
  const { userId, channel } = props

  if (!channel) return
  const companion = getPrivateChatFriend(userId, channel)
  const companionRole = companion?.user.role

  if (companionRole === UserRole.Agent) return 'Agent'
  if (companionRole === UserRole.CastingDirector) return 'Casting Director'
  if (companionRole === UserRole.Producer) return 'Producer'
}
