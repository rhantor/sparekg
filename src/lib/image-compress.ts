/**
 * Shrinks a photo before upload. Phone cameras produce 4–12 MB images, far more
 * than a ticket needs to stay legible, and the upload sits on the critical path
 * of posting a flight.
 *
 * Returns the original file whenever compressing cannot help: a PDF, a format
 * this browser cannot decode (HEIC outside Safari), or a result that came out
 * no smaller than what went in.
 */
export async function compressImage(
  file: File,
  { maxDimension = 2000, quality = 0.85 } = {},
): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;

  try {
    // Honours EXIF orientation by default, so a portrait phone photo stays upright.
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    // A PNG screenshot can be transparent and JPEG has no alpha channel, so
    // paint white first — otherwise transparent areas turn black.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;

    const name = `${file.name.replace(/\.[^.]+$/, '') || 'ticket'}.jpg`;
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
