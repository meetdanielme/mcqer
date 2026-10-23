export const MAX_IMAGE_BYTES = 1024 * 1024;
export const repositoryImagePattern = /^questions\/images\/[a-zA-Z0-9][a-zA-Z0-9_-]*\.(png|jpe?g|webp)$/;
const embeddedPattern = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

export function validateImage(image) {
  if (!image || typeof image !== 'object' || Array.isArray(image)) return 'must have src and alt fields.';
  if (typeof image.alt !== 'string' || !image.alt.trim()) return 'alt must describe the image.';
  if (typeof image.src !== 'string') return 'src must be an embedded image or a questions/images/ file.';
  if (repositoryImagePattern.test(image.src)) return '';
  const match = embeddedPattern.exec(image.src);
  if (!match || match[2].length % 4 !== 0) return 'src must be a PNG, JPEG or WebP data URL, or a questions/images/ file.';
  const bytes = match[2].length * 3 / 4 - (match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0);
  if (bytes > MAX_IMAGE_BYTES) return 'must be no larger than 1 MB.';
  let header;
  try { header = atob(match[2].slice(0, 32)); } catch { return 'contains invalid base64.'; }
  const valid = match[1] === 'png' ? header.startsWith('\x89PNG\r\n\x1a\n') : match[1] === 'jpeg' ? header.startsWith('\xff\xd8\xff') : header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP';
  return valid ? '' : 'content does not match its image type.';
}

export function imageUrl(src, baseUrl) {
  return repositoryImagePattern.test(src) ? baseUrl.replace(/\/?$/, '/') + src : src;
}

export function blobDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.readAsDataURL(blob);
  });
}

export async function prepareImage(file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP image.');
  if (file.size > 20 * MAX_IMAGE_BYTES) throw new Error('Choose an image smaller than 20 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    if (scale === 1 && file.size <= MAX_IMAGE_BYTES) return blobDataUrl(file);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.9));
    if (!blob || blob.size > MAX_IMAGE_BYTES) throw new Error('The image is still too large. Choose a smaller image.');
    return blobDataUrl(blob);
  } catch (error) {
    if (error instanceof DOMException) throw new Error('This image could not be opened. Try another PNG, JPEG or WebP.');
    throw error;
  } finally { URL.revokeObjectURL(url); }
}

export async function portableCourses(courses, baseUrl, fetcher = fetch) {
  const embedded = new Map();
  const copy = structuredClone(courses);
  for (const course of copy) for (const chapter of course.chapters) for (const question of chapter.questions) {
    if (!question.image || !repositoryImagePattern.test(question.image.src)) continue;
    const src = question.image.src;
    if (!embedded.has(src)) embedded.set(src, (async () => {
      const response = await fetcher(imageUrl(src, baseUrl));
      if (!response.ok) throw new Error('Could not include image in backup: ' + src);
      const data = await blobDataUrl(await response.blob());
      const issue = validateImage({ src: data, alt: question.image.alt });
      if (issue) throw new Error('Backup image ' + issue);
      return data;
    })());
    question.image.src = await embedded.get(src);
  }
  return copy;
}
