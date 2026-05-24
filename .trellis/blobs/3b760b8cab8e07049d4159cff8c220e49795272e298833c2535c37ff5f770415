import { invoke } from '@tauri-apps/api/core';

const OLLAMA_HOST =
  import.meta.env.VITE_OLLAMA_HOST || 'http://localhost:11434';
const IMAGE_CAPTION_MODEL =
  import.meta.env.VITE_IMAGE_CAPTION_MODEL || 'llava:7b';
const TEXT_SUMMARY_MODEL =
  import.meta.env.VITE_TEXT_SUMMARY_MODEL || 'llama3.2:latest';

export async function captionImageWithLlava(
  filePath: string,
): Promise<{ description: string; model: string }> {
  try {
    const res = await invoke<{ description: string; model: string }>(
      'caption_image',
      {
        filePath,
        host: OLLAMA_HOST,
        model: IMAGE_CAPTION_MODEL,
      },
    );
    return res;
  } catch (error: any) {
    // Enhance error message for better debugging
    const errorMsg = error?.toString() || 'Unknown error';
    throw new Error(errorMsg);
  }
}

export async function summarizeMarkdownText(
  markdown: string,
  onStream?: (chunk: string) => void,
): Promise<{ summary: string; model: string }> {
  if (!markdown || !markdown.trim()) {
    throw new Error('Markdown content is empty');
  }

  try {
    const prompt = `Summarize the content in 2-3 factual sentences. State only what is present in the text. If the content lacks coherent information, state "No meaningful content to summarize." Do not use conversational language, questions, or qualifiers.

${markdown}`;

    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: TEXT_SUMMARY_MODEL,
        prompt,
        stream: !!onStream,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    if (onStream && response.body) {
      // Streaming mode
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let model = TEXT_SUMMARY_MODEL;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              fullResponse += data.response;
              onStream(data.response);
            }
            if (data.model) {
              model = data.model;
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }

      return { summary: fullResponse, model };
    } else {
      // Non-streaming mode
      const data = await response.json();
      return {
        summary: data.response,
        model: data.model || TEXT_SUMMARY_MODEL,
      };
    }
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || 'Unknown error';
    throw new Error(errorMsg);
  }
}

export async function summarizePdfText(
  filePath: string,
  onStream?: (chunk: string) => void,
): Promise<{ summary: string; model: string }> {
  try {
    // Extract text from PDF
    const { text, page_count, truncated } = await invoke<{
      text: string;
      page_count: number;
      truncated: boolean;
    }>('extract_pdf_text', {
      filePath,
      maxPages: 10, // Limit to first 10 pages
    });

    if (!text || text.trim().length === 0) {
      throw new Error('No text content found in PDF');
    }

    // Generate summary using Ollama
    const prompt = `Summarize the content in 2-3 factual sentences. State only what is present in the text. If the content lacks coherent information, state "No meaningful content to summarize." Do not use conversational language, questions, or qualifiers.\n\n${text}${truncated ? '\n\n(Partial excerpt only)' : ''}`;

    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: TEXT_SUMMARY_MODEL,
        prompt,
        stream: !!onStream,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    if (onStream && response.body) {
      // Streaming mode
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let model = TEXT_SUMMARY_MODEL;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              fullResponse += data.response;
              onStream(data.response);
            }
            if (data.model) {
              model = data.model;
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }

      return { summary: fullResponse, model };
    } else {
      // Non-streaming mode
      const data = await response.json();
      return {
        summary: data.response,
        model: data.model || TEXT_SUMMARY_MODEL,
      };
    }
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || 'Unknown error';
    throw new Error(errorMsg);
  }
}

export function isImagePath(path: string): boolean {
  const ext = path.toLowerCase().split('.').pop() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'svg'].includes(
    ext,
  );
}

export function isPdfPath(path: string): boolean {
  const ext = path.toLowerCase().split('.').pop() || '';
  return ext === 'pdf';
}
