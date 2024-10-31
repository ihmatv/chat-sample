type ActiveChannel = {
  [key: string]: Channel
}

type TokenProvider = () => Promise<string>
type TokenOrProvider = null | string | TokenProvider | undefined

type ConnectChatUser = {
  id: string
  name: string
  image: string
}

export type PrimitiveFilter<ObjectType> = ObjectType | null
export type QueryFilter<ObjectType = string> = {
  // is equal
  $eq?: PrimitiveFilter<ObjectType> | PrimitiveFilter<ObjectType>[]
  $exists?: boolean
  // is greater than
  $gt?: PrimitiveFilter<ObjectType>
  // greater than or equal to
  $gte?: PrimitiveFilter<ObjectType>
  $in?: PrimitiveFilter<ObjectType>[]
  // is less than
  $lt?: PrimitiveFilter<ObjectType>
  // is less than or equal
  $lte?: PrimitiveFilter<ObjectType>
  // not equal
  $ne?: PrimitiveFilter<ObjectType>
  // not in
  $nin?: PrimitiveFilter<ObjectType>[]
  $autocomplete?: PrimitiveFilter<ObjectType>
}

export type ChannelFilters<ObjectType = string> = {
  id?: QueryFilter<ObjectType>
  type?: ChannelType
  members?: QueryFilter<ObjectType>
  name?: QueryFilter<ObjectType>
  isGroup?: QueryFilter<boolean>
}

export type UserFilters<ObjectType = string> = {
  id?: QueryFilter<ObjectType>
  name?: QueryFilter<ObjectType>
  user_id?: QueryFilter<ObjectType>
  created_at?: QueryFilter<ObjectType>
}

export enum AscDesc {
  Asc = 1,
  Desc = -1,
}

export type ChannelSort = {
  created_at?: AscDesc
  has_unread?: AscDesc
  last_message_at?: AscDesc
  last_updated?: AscDesc
  member_count?: AscDesc
  unread_count?: AscDesc
  updated_at?: AscDesc
}

export type ChannelOptions = {
  limit?: number
  member_limit?: number
  message_limit?: number
  offset?: number
  presence?: boolean
  state?: boolean
  user_id?: string
  watch?: boolean
}

export type MemberSort = {
  id?: AscDesc
  name?: AscDesc
  user_id?: AscDesc
  created_at?: AscDesc
}

export type MemberOptions = {
  limit?: number
  offset?: number
  user_id_gt?: string
  user_id_gte?: string
  user_id_lt?: string
  user_id_lte?: string
}

type CustomEventData = {
  type: string
}

type EventCallback = (event: ChatEvent) => void

type MessageUpdatableFields = Omit<
  ChatMessage,
  'created_at' | 'updated_at' | 'deleted_at' | 'user' | 'date' | 'isUnread'
>

export type UpdateProps<T> = {
  set?: Partial<T>
  unset?: Array<keyof T>
}

export type CreateChannelData = {
  members?: string[]
  name?: string
  description?: string
  isGroup?: boolean
  unavailableForActors?: boolean
}

type PartialUpdateUserProps = UpdateProps<Omit<ChatUser, 'id'>> & {
  id: string
}

export type ChatClient = {
  user: ChatUser
  activeChannels: ActiveChannel[]
  connectUser: (
    user: ConnectChatUser,
    tokenProvider: TokenOrProvider,
  ) => Promise<void>
  revokeUserToken: (userId: string, before?: Date) => Promise<void>
  disconnectUser: () => Promise<void>
  queryChannels: (
    filters: ChannelFilters,
    sort?: ChannelSort,
    options?: ChannelOptions,
  ) => Promise<Channel[]>
  channel: (
    type: string,
    channelIdOrCustom: string | CreateChannelData | null,
    custom?: CreateChannelData,
  ) => Channel
  getChannelById: (channelType: string, channelID: string) => Channel
  partialUpdateUser: (props: PartialUpdateUserProps) => Promise<void>
  partialUpdateMessage: (
    id: string,
    data: UpdateProps<MessageUpdatableFields>,
  ) => Promise<void>
  deleteMessage: (id: string, hardDelete?: boolean) => Promise<void>
  sendUserCustomEvent: (userId: string, data: CustomEventData) => Promise<void>
  on: (
    eventTypeOrCallback: string | EventCallback,
    callback?: EventCallback,
  ) => OnListenerResponse
  pinMessage: (
    messageId: string,
    timeoutOrExpirationDate?: null | number | string | Date,
  ) => Promise<void>
  unpinMessage: (messageId: string) => Promise<void>
}

export enum UserRole {
  CastingDirector = 'casting_director',
  Producer = 'producer',
  Agent = 'agent',
  Actor = 'actor',
  // default user role, should not be used in the app
  User = 'user',
}

export enum MemberRole {
  Member = 'channel_member',
  Moderator = 'channel_moderator',
  ChannelMemberDisabledActor = 'channel_member_disabled_actor',
}

export enum ChannelType {
  Messaging = 'messaging',
}

export type ChatUser = {
  id: string
  name: string
  image: string | null
  online: boolean
  role: UserRole
  // date of last user activities
  last_active: string
  created_at: string
  updated_at: string
  customId: string
  unread_channels: number
  customGenderPronoun: string | null
}

type ChannelData = {
  id: string
  name: string
  description: string
  isGroup: boolean
  image: string | null
  last_message_at: string
  created_at: string
  updated_at: string
  type: ChannelType
  unavailableForActors: boolean
}

export type ChannelMembership = {
  channel_role: MemberRole
  user: ChatUser
  user_id?: string
  is_moderator?: boolean
}

export type ChannelMembers = {
  [id: string]: ChannelMembership
}

export type ChatAttachmentType = 'file' | 'image' | 'video'

export type ChatMessageAttachment = {
  fallback?: string
  image_url?: string
  asset_url?: string
  type?: ChatAttachmentType
  title?: string
  title_link?: string
  text?: string
  file_size?: number
}

type MessageCustomType =
  | 'dateSeparator'
  | 'unreadSeparator'
  | 'system'
  | 'default'

type MessageLabel =
  | 'deleted'
  | 'ephemeral'
  | 'error'
  | 'regular'
  | 'reply'
  | 'system'

export type ChatMessage = {
  id: string
  attachments: ChatMessageAttachment[]
  edited: boolean
  pinned: boolean
  pinned_at: string | null
  status: string
  html: string | null
  text: string | null
  type: MessageLabel
  customType: MessageCustomType
  user: ChatUser
  created_at: string | Date
  updated_at: string | Date
  deleted_at: string | Date
  date?: Date
}

type ChannelState = {
  members: ChannelMembers
  membership: ChannelMembership
  messages: ChatMessage[]
  pinnedMessages: ChatMessage[]
  unreadCount: number
  typing: Record<string, ChatEvent>
}

type MessagePaginationOptions = {
  id_gt?: string
  id_gte?: string
  id_lt?: string
  id_lte?: string
  limit?: number
  offset?: number
}

type ChannelQueryOptions = {
  messages?: MessagePaginationOptions
}

export type ChatEvent = {
  channel?: Channel
  channel_id?: string
  channel_type?: string
  // full event id (channel type + id)
  cid?: string
  clear_history?: boolean
  connection_id?: string
  created_at?: string
  hard_delete?: boolean
  type?: string
  mark_messages_deleted?: boolean
  member?: ChannelMembership
  message?: ChatMessage
  online?: boolean
  parent_id?: string
  received_at?: string | Date
  team?: string
  total_unread_count?: number
  unread_channels?: number
  unread_count?: number
  user?: ChatUser
  user_id?: string
  watcher_count?: number
  channel_created?: boolean | null
}

type OnListenerResponse = {
  unsubscribe: () => void
}

type SendMessageProps = {
  text?: string
  attachments?: ChatMessageAttachment[]
  customType?: MessageCustomType
  silent?: boolean
}

export type FileUploadResponse = {
  file: string
}

export type QueryMembersResponse = {
  members: ChannelMembership[]
}

export type Channel = {
  id: string
  // full channel id (channel type + id)
  cid: string
  data: ChannelData
  state: ChannelState
  type: ChannelType
  getClient: () => ChatClient
  lastMessage: () => ChatMessage
  lastRead: () => Date | null
  markRead: () => Promise<void>
  countUnread: () => number
  addMembers: (ids: string[], message?: SendMessageProps) => Promise<void>
  removeMembers: (ids: string[], message?: SendMessageProps) => Promise<void>
  updatePartial: (data: UpdateProps<GroupChannelDataProps>) => Promise<void>
  query: (options: ChannelQueryOptions) => Promise<ChannelState>
  queryMembers: (
    filters: UserFilters,
    sort?: MemberSort,
    options?: MemberOptions,
  ) => Promise<QueryMembersResponse>
  // start typing event
  keystroke: () => Promise<void>
  stopTyping: () => Promise<void>
  sendMessage: (data: SendMessageProps) => Promise<void>
  sendFile: (
    uri: string | File,
    name?: string,
    contentType?: string,
    user?: ChatUser,
  ) => Promise<FileUploadResponse>
  sendImage: (
    uri: string | NodeJS.ReadableStream | File,
    name?: string,
    contentType?: string,
    user?: ChatUser,
  ) => Promise<FileUploadResponse>
  delete: () => Promise<void>
  deleteFile: (url: string) => void
  deleteImage: (url: string) => void
  watch: (options?: ChannelOptions) => Promise<void>
  on: (
    eventType: string,
    callback: (event: ChatEvent) => void,
  ) => OnListenerResponse
}

export type GroupChannelDataProps = {
  name?: string
  description?: string
  image?: string
  unavailableForActors?: boolean
}

export type AddModeratorsProps = {
  userIds: string[]
  channelId: string
}

export type DemoteModeratorsProps = {
  userIds: string[]
  channelId: string
}

export type UpdateUserChannelRoleProps = {
  role: MemberRole
  userId: string
  channelId: string
}

export type SearchActorResult = {
  friendshipId: string
  actorId: string
  userUuid: string
  firstName: string
  lastName: string
  profilePictureId: string
  profilePictureLink: string
  createdAt: string
  genderPronoun: string
}
