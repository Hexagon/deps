import { parse as parseJsonc } from "@std/jsonc";

/**
 * Read json file or return null on error
 */
export async function tryReadJsoncFile<T>(
  filename: string,
): Promise<T | null> {
  try {
    const text = await Deno.readTextFile(filename);
    const fileContent = parseJsonc(text);
    if (fileContent) {
      return fileContent as unknown as T;
    } else {
      return {} as T;
    }
  } catch (_error) {
    return null;
  }
}
