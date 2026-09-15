import * as FileSystem from 'expo-file-system';

export const LLAMA_MODEL_FILENAME = 'Llama-3.2-1B-Instruct-Q4_K_M.gguf';

/**
 * The GGUF is intentionally not bundled in the app binary. Configure a
 * trusted HTTPS mirror with EXPO_PUBLIC_LLAMA_MODEL_URL for a dev/EAS build.
 */
export function getConfiguredLlamaModelUrl(): string | null {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const url = env?.EXPO_PUBLIC_LLAMA_MODEL_URL?.trim();
  return url ? url : null;
}

export async function ensureLlamaModel(
  onProgress?: (ratio: number) => void,
): Promise<string | null> {
  const url = getConfiguredLlamaModelUrl();
  const directory = FileSystem.documentDirectory;
  if (!url || !directory) return null;

  const destination = `${directory}${LLAMA_MODEL_FILENAME}`;
  const existing = await FileSystem.getInfoAsync(destination);
  if (existing.exists) {
    onProgress?.(1);
    return destination;
  }

  const download = FileSystem.createDownloadResumable(
    url,
    destination,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (totalBytesExpectedToWrite > 0) {
        onProgress?.(totalBytesWritten / totalBytesExpectedToWrite);
      }
    },
  );
  const result = await download.downloadAsync();
  if (!result?.uri) throw new Error('GGUF download did not return a file URI');
  onProgress?.(1);
  return result.uri;
}
