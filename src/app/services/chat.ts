import { get, post } from 'app/services/fetch'
import {
  AddModeratorsProps,
  DemoteModeratorsProps,
  UpdateUserChannelRoleProps,
} from 'app/features/chat/types'
import { loadingAndErrorWrapper } from 'utilities/loadingAndErrorWrapper'

export const getChatToken = () =>
  loadingAndErrorWrapper({
    action: async () => {
      const { token } = await get({
        endpoint: 'chatToken',
        noRefreshSession: true,
      })
      return token
    },
  })

export const addChannelModerators = (props: AddModeratorsProps) =>
  loadingAndErrorWrapper({
    action: async () => {
      await post({
        endpoint: `stream/addChannelModerators`,
        body: props,
      })
    },
  })

export const demoteChannelModerators = (props: DemoteModeratorsProps) =>
  loadingAndErrorWrapper({
    action: async () => {
      await post({
        endpoint: `stream/demoteChannelModerators`,
        body: props,
      })
    },
  })

export const updateUserChannelRole = (props: UpdateUserChannelRoleProps) =>
  loadingAndErrorWrapper({
    action: async () => {
      await post({
        endpoint: `stream/updateChannelUserRole`,
        body: props,
      })
    },
  })
