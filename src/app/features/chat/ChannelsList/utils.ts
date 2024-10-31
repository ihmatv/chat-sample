import { actorStore } from 'app/features/actors/actorStore'
import { getActor } from 'app/services/actors'

export const getIsFriend = async (actorId: string) => {
  await getActor(actorId)
  const { friendship } = actorStore.get(actorId) || {}
  return Boolean(friendship?.friendshipId)
}

type GetIsCanHaveConversationProps = {
  actorId: string
  isIndustryProfessional: boolean
}

export const getIsCanHaveConversation = async (
  props: GetIsCanHaveConversationProps,
) => {
  const { actorId, isIndustryProfessional } = props

  let canHaveConversation = false
  if (isIndustryProfessional) {
    canHaveConversation = true
  } else {
    canHaveConversation = await getIsFriend(actorId)
  }

  return canHaveConversation
}

type GetIsNameStartsWithSearchTextProps = {
  name: string
  searchText: string
}

export const getIsNameStartsWithSearchText = (
  props: GetIsNameStartsWithSearchTextProps,
) => {
  const { name, searchText } = props

  const lowerCaseName = name.toLowerCase()
  const lowerCaseSearchText = searchText.toLowerCase()

  return lowerCaseName
    .split(' ')
    .some(text => text.startsWith(lowerCaseSearchText))
}
