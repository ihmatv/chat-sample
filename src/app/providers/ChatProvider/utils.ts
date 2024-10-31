import { StreamChat } from 'stream-chat'
import { isMatch } from 'lodash'

import { CHAT_APP_KEY } from 'app/config'
import { UserType } from 'app/features/user/types'
import { isUnder16 as getIsUnder16 } from 'app/features/legal/GuardianConsentCheckboxField'
import { ChatClient, UserRole } from 'app/features/chat/types'
import { getFullName } from 'utilities/names'
import { getChatToken } from 'app/services/chat'
import {
  isUserCastingDirector,
  isUserProducer,
  isUserAgent,
  isUserActor,
} from 'app/features/user/store'

const getUserCustomId = (user: UserType) => {
  const customId =
    user?.actorId ||
    user?.castingDirectorId ||
    user?.producerId ||
    user?.agentId

  return customId || ''
}

const getChatClientRole = () => {
  if (isUserCastingDirector()) return UserRole.CastingDirector
  if (isUserProducer()) return UserRole.Producer
  if (isUserAgent()) return UserRole.Agent
  if (isUserActor()) return UserRole.Actor
}

const getChatUserData = (user: UserType) => {
  const customId = getUserCustomId(user)

  return {
    name: getFullName(user.firstName, user.lastName),
    image: user.profilePictureLink,
    role: getChatClientRole(),
    customId,
    customGenderPronoun: user.genderPronoun,
  }
}

type UpdateChatClientProps = {
  user: UserType
  chatClient: ChatClient
}

export const updateChatClient = async (props: UpdateChatClientProps) => {
  const { user, chatClient } = props

  const updatedUserData = getChatUserData(user)

  if (!isMatch(chatClient.user, updatedUserData)) {
    await chatClient.partialUpdateUser({
      id: chatClient.user.id,
      set: updatedUserData,
    })
  }
  return chatClient
}

export const clearChatClient = async (chatClient: ChatClient | null) => {
  if (chatClient?.user) {
    await chatClient.revokeUserToken(chatClient.user.id, new Date())
    await chatClient.disconnectUser()
  }
}

type HandleConnectChatClientProps = {
  client: StreamChat
  user: UserType
}

const handleConnectChatClient = async (props: HandleConnectChatClientProps) => {
  const { client, user } = props

  await client.connectUser(
    {
      id: user.userUuid,
      ...getChatUserData(user),
    },
    async () => {
      try {
        return await getChatToken()
      } catch (e) {
        return null
      }
    },
  )
  // get rid of the default User role (it's just an additional check)
  if (client.user?.role === UserRole.User && getChatClientRole()) {
    await client.partialUpdateUser({
      id: user.userUuid,
      set: { role: getChatClientRole() },
    })
  }
}

const getIsChatAvailableForUnder16Actor = (user: UserType) => {
  const isProfileVisibleToIndustryProfessionals = user.childConsentTypes?.includes(
    'ONLY_VETTED_INDUSTRY_PROFESSIONALS',
  )

  return isProfileVisibleToIndustryProfessionals
}

// should be available for:
// - CD
// - adult actors
// - actors under 16 with ONLY_VETTED_INDUSTRY_PROFESSIONALS consent type
const getIsChatAvailable = (user: UserType) => {
  if (isUserCastingDirector() || isUserProducer() || isUserAgent()) return true

  const isUnder16 = user?.dateOfBirth && getIsUnder16(user.dateOfBirth)

  if (user.actorId && isUnder16) {
    return getIsChatAvailableForUnder16Actor(user)
  } else if (user.actorId) {
    return true
  }
  return false
}

type GetChatClientProps = {
  user: UserType
  chatClient: ChatClient | null
}

export const getChatClient = async (
  props: GetChatClientProps,
): Promise<ChatClient> => {
  const { user, chatClient } = props

  const client = StreamChat.getInstance(CHAT_APP_KEY || '')

  // if current user is connected we must sync users data and return his chat client
  if (chatClient && chatClient.user.id === user.userUuid) {
    return await updateChatClient({ user, chatClient })
    // if other user's client is connected we must logout at first
  } else if (chatClient && chatClient.user.id !== user.userUuid) {
    await clearChatClient(chatClient)
  }

  if (getIsChatAvailable(user)) {
    await handleConnectChatClient({ client, user })
  }
  return (client as unknown) as ChatClient
}
