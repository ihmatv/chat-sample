import { actorStore } from 'app/features/actors/actorStore'
import { getActor } from 'app/services/actors'
import { getFullName } from 'utilities/names'

export type MockChannelType = {
  id: string
  title: string
  description: string
  image?: string
  actorId?: string
  userUuid?: string
}

export const generateMockChannelData = async (
  friendId: string,
): Promise<MockChannelType> => {
  if (!actorStore.get(friendId)) {
    await getActor(friendId)
  }

  const {
    firstName,
    lastName,
    profilePictureLink,
    userUuid,
    genderPronoun,
    actorId,
  } = actorStore.get(friendId) || {}

  return {
    id: friendId,
    title: getFullName(firstName, lastName),
    description: genderPronoun || 'Actor',
    image: profilePictureLink,
    userUuid,
    actorId,
  }
}
