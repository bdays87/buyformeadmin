/** Shrink public shop logos before transport. The API independently re-encodes them. */
export async function optimizeUploadImage(file: File, maxEdge = 512): Promise<File> {
  const fail = (message: string): never => { throw Object.assign(new Error(message), { data: { message } }) }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return fail('Choose a JPEG, PNG or WebP image.')
  }

  if (file.size > 20 * 1024 * 1024) return fail('Choose an image smaller than 20 MB.')

  let bitmap: ImageBitmap | undefined
  const canvas = document.createElement('canvas')

  try {
    if (typeof createImageBitmap !== 'function') {
      if (file.size <= 2 * 1024 * 1024) return file
      return fail('This browser cannot resize images. Try an image under 2 MB or use a newer browser.')
    }

    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40_000_000) {
      return fail('This image has too many pixels. Resize it before uploading.')
    }

    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) return fail('Unable to prepare this image. Please try another browser.')

    let result: Blob | null = null
    do {
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

      for (const quality of [0.82, 0.74, 0.66]) {
        result = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality))
        if (!result) return fail('Unable to prepare this image. Please choose another image.')
        if (result.size <= 512 * 1024) {
          const extension = result.type === 'image/webp' ? 'webp' : 'png'
          return new File([result], `${file.name.replace(/\.[^.]+$/, '')}.${extension}`, { type: result.type, lastModified: file.lastModified })
        }
      }

      canvas.width = Math.max(1, Math.floor(canvas.width * 0.8))
      canvas.height = Math.max(1, Math.floor(canvas.height * 0.8))
    } while (Math.max(canvas.width, canvas.height) >= 320)

    return fail('This image could not be compressed enough. Please choose another image.')
  } catch (error: any) {
    if (error?.data?.message) throw error
    return fail('This image could not be read. Try a different JPEG, PNG or WebP image.')
  } finally {
    bitmap?.close()
    canvas.width = 0
    canvas.height = 0
  }
}
