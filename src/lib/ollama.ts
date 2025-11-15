import { invoke } from '@tauri-apps/api/core';

const OLLAMA_HOST = import.meta.env.VITE_OLLAMA_HOST || 'http://localhost:11434';
const IMAGE_CAPTION_MODEL = import.meta.env.VITE_IMAGE_CAPTION_MODEL || 'llava:7b';

export async function captionImageWithLlava(filePath: string): Promise<{ description: string; model: string }>{
  const res = await invoke<{ description: string; model: string }>('caption_image', {
    filePath,
    host: OLLAMA_HOST,
    model: IMAGE_CAPTION_MODEL,
  });
  return res;
}

export function isImagePath(path: string): boolean {
  const ext = path.toLowerCase().split('.').pop() || '';
  return ['jpg','jpeg','png','gif','webp','bmp','ico','svg'].includes(ext);
}
