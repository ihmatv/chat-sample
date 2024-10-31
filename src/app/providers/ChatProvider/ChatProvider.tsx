import React, { createContext, useContext, useEffect, useState } from 'react'

import { ChatClient } from 'app/features/chat/types'
import { UserType } from 'app/features/user/types'

import { getChatClient, clearChatClient as clearClient } from './utils'

type ChatContextProps = {
  chatClient: ChatClient | null
  hasUnreadMessages: boolean
  clearChatClient: () => void
}

const ChatContext = createContext<ChatContextProps>({
  chatClient: null,
  hasUnreadMessages: false,
  clearChatClient: () => null,
})

export const useChatClient = () => {
  return useContext(ChatContext)
}

type ChatProviderProps = {
  user: UserType
}

const ChatProvider: React.FC<ChatProviderProps> = ({ user, children }) => {
  const [client, setClient] = useState<ChatClient | null>(null)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)

  const refetchChatClient = async () => {
    const chatClient = await getChatClient({ user, chatClient: client }).catch(
      error => {
        console.error(error)
        return null
      },
    )
    setClient(chatClient)
  }

  useEffect(() => {
    if (user) refetchChatClient()
    else {
      console.log('CLEAR_CHAT_CLIENT')
      clearClient(client)
    }
  }, [user])

  useEffect(() => {
    if (client) {
      setHasUnreadMessages(Boolean(client.user?.unread_channels))
    } else {
      setHasUnreadMessages(false)
    }
  }, [client])

  useEffect(() => {
    const clientUnreadMessagesListener = client?.on(event => {
      if (typeof event.unread_channels === 'number') {
        setHasUnreadMessages(Boolean(event.unread_channels))
      }
    })

    return () => clientUnreadMessagesListener?.unsubscribe()
  }, [client])

  return (
    <ChatContext.Provider
      value={{
        chatClient: client,
        hasUnreadMessages,
        clearChatClient: () => clearClient(client),
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export default ChatProvider
