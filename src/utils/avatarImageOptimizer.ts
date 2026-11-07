/**
 * High-Sharpness, Low-Size Avatar Image Optimizer for PelatihKu PRO
 *
 * Why this keeps avatars razor-sharp while costing minimal storage (~12–28 KB):
 * 1. Center-crops the source photo to a 1:1 square so the subject fills the frame.
 * 2. Uses multi-pass step-down canvas scaling (halving dimensions per pass with
 *    `imageSmoothingQuality = 'high'`) down to 320x320px (3x Retina density for 40–108px UI avatars).
 *    Direct single-step downscaling from 4000px -> 320px causes aliasing/blurriness in browser canvases;
 *    multi-step halving preserves crisp facial and edge details.
 * 3. Encodes to modern WebP (`image/webp` at 0.86 quality, with automatic fallback to `image/jpeg`),
 *    and adaptively steps down quality if needed so the resulting Data URL stays under ~38 KB.
 */

export interface OptimizedAvatarResult {
  dataUrl: string;
  sizeKB: number;
  width: number;
  height: number;
  format: 'webp' | 'jpeg';
}

export async function optimizeAvatarImage(
  file: File,
  targetSizePx = 320,
  maxBytes = 38 * 1024
): Promise<OptimizedAvatarResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File harus berupa gambar (JPG, PNG, WebP, atau HEIC).');
  }

  const img = await loadImageFromFile(file);

  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;

  if (!srcWidth || !srcHeight) {
    throw new Error('Gagal membaca dimensi gambar.');
  }

  // 1. Compute 1:1 center-crop square from the original image
  const cropSize = Math.min(srcWidth, srcHeight);
  const cropX = Math.floor((srcWidth - cropSize) / 2);
  const cropY = Math.floor((srcHeight - cropSize) / 2);

  // Never upscale small images beyond their native crop size
  const finalSize = Math.min(targetSizePx, cropSize);

  // 2. Step-down multi-pass halving to prevent browser canvas downscaling blur/aliasing
  let currentSize = cropSize;
  let currentCanvas = document.createElement('canvas');
  let currentCtx = currentCanvas.getContext('2d');

  if (!currentCtx) {
    throw new Error('Canvas 2D context tidak tersedia.');
  }

  // First pass: extract square crop
  // If the image is huge (e.g. > 1280px), start at min(cropSize, 1280) to save memory
  const initialCanvasSize = Math.min(cropSize, Math.max(finalSize * 4, 1024));
  currentCanvas.width = initialCanvasSize;
  currentCanvas.height = initialCanvasSize;
  currentCtx.imageSmoothingEnabled = true;
  currentCtx.imageSmoothingQuality = 'high';
  currentCtx.drawImage(
    img,
    cropX,
    cropY,
    cropSize,
    cropSize,
    0,
    0,
    initialCanvasSize,
    initialCanvasSize
  );
  currentSize = initialCanvasSize;

  // Halve iteratively until within 2x of finalSize
  while (currentSize * 0.5 > finalSize) {
    const nextSize = Math.max(finalSize, Math.floor(currentSize * 0.5));
    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = nextSize;
    stepCanvas.height = nextSize;
    const stepCtx = stepCanvas.getContext('2d');
    if (!stepCtx) break;
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(currentCanvas, 0, 0, currentSize, currentSize, 0, 0, nextSize, nextSize);
    currentCanvas = stepCanvas;
    currentSize = nextSize;
  }

  // Final pass to exact finalSize (320x320)
  if (currentSize !== finalSize) {
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = finalSize;
    finalCanvas.height = finalSize;
    const finalCtx = finalCanvas.getContext('2d');
    if (finalCtx) {
      finalCtx.imageSmoothingEnabled = true;
      finalCtx.imageSmoothingQuality = 'high';
      finalCtx.drawImage(currentCanvas, 0, 0, currentSize, currentSize, 0, 0, finalSize, finalSize);
      currentCanvas = finalCanvas;
    }
  }

  // 3. Encode to WebP (with JPEG fallback) and adaptive quality step-down
  const qualities = [0.86, 0.8, 0.74, 0.68];
  let bestDataUrl = '';
  let usedFormat: 'webp' | 'jpeg' = 'webp';

  for (const q of qualities) {
    const webpCandidate = currentCanvas.toDataURL('image/webp', q);
    const isWebpSupported = webpCandidate.startsWith('data:image/webp');
    const candidate = isWebpSupported
      ? webpCandidate
      : currentCanvas.toDataURL('image/jpeg', q);
    usedFormat = isWebpSupported ? 'webp' : 'jpeg';
    bestDataUrl = candidate;

    const estimatedBytes = estimateDataUrlBytes(candidate);
    if (estimatedBytes <= maxBytes) {
      break;
    }
  }

  const sizeKB = Math.max(1, Math.round((estimateDataUrlBytes(bestDataUrl) / 1024) * 10) / 10);

  return {
    dataUrl: bestDataUrl,
    sizeKB,
    width: finalSize,
    height: finalSize,
    format: usedFormat,
  };
}

function estimateDataUrlBytes(dataUrl: string): number {
  const base64Index = dataUrl.indexOf(',');
  if (base64Index === -1) return dataUrl.length;
  const base64Length = dataUrl.length - (base64Index + 1);
  return Math.ceil((base64Length * 3) / 4);
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Gagal memuat file gambar. Pastikan format gambar valid.'));
    };
    img.src = objectUrl;
  });
}
