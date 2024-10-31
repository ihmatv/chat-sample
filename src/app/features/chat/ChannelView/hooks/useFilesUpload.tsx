import { useState } from 'react'

import {
  Channel,
  ChatAttachmentType,
  ChatMessageAttachment,
} from 'app/features/chat/types'
import { isImageFile, isVideoFile } from 'utilities/files'

type Props = {
  channel: Channel | null
}

export const useFilesUpload = (props: Props) => {
  const { channel } = props

  const [isUploading, setIsUploading] = useState(false)
  const [isError, setIsError] = useState(false)

  const getFileType = (file: File): ChatAttachmentType => {
    if (isImageFile(file)) return 'image'
    if (isVideoFile(file)) return 'video'
    return 'file'
  }

  const getAttachmentProps = (
    file: File,
    fileUrl: string,
  ): ChatMessageAttachment => {
    const type = getFileType(file)

    return {
      image_url: type === 'image' ? fileUrl : '',
      asset_url: type !== 'image' ? fileUrl : '',
      title: file.name,
      file_size: file.size,
      type,
    }
  }

  const uploadFiles = async (
    files: File[],
  ): Promise<ChatMessageAttachment[]> => {
    try {
      if (!channel) return []

      setIsError(false)
      setIsUploading(true)

      const uploadRequests = files.map(file =>
        isImageFile(file) ? channel.sendImage(file) : channel.sendFile(file),
      )
      const uploadedFiles = await Promise.all(uploadRequests)

      const attachments = uploadedFiles.map((attachment, index) =>
        getAttachmentProps(files[index], attachment.file),
      )
      setIsUploading(false)

      return attachments
    } catch (e) {
      setIsError(true)
    }

    return []
  }
  const uploadFilesForSpecificChannel = async (
    files: File[],
    channel?: Channel,
  ): Promise<ChatMessageAttachment[]> => {
    try {
      if (!channel) return []

      setIsError(false)
      setIsUploading(true)

      const uploadRequests = files.map(file =>
        isImageFile(file) ? channel.sendImage(file) : channel.sendFile(file),
      )
      const uploadedFiles = await Promise.all(uploadRequests)

      const attachments = uploadedFiles.map((attachment, index) =>
        getAttachmentProps(files[index], attachment.file),
      )
      setIsUploading(false)

      return attachments
    } catch (e) {
      setIsError(true)
    }

    return []
  }

  return {
    isUploadingFiles: isUploading,
    isUploadingFilesError: isError,
    uploadFiles,
    uploadFilesForSpecificChannel,
  }
}
