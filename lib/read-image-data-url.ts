/** Limit file size before base64 (localStorage / deck JSON stay reasonable). */
export const MAX_CUSTOM_BACKGROUND_BYTES = 2_500_000;

export function isDataUrlImage(url: string | undefined): boolean {
  return Boolean(url?.trim().startsWith("data:image/"));
}

export async function readImageFileAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPEG, PNG, WebP, or similar).");
  }
  if (file.size > MAX_CUSTOM_BACKGROUND_BYTES) {
    const mb = MAX_CUSTOM_BACKGROUND_BYTES / 1_000_000;
    throw new Error(`Image is too large (max about ${mb} MB). Try a smaller file.`);
  }
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const r = fr.result;
      if (typeof r !== "string") {
        reject(new Error("Could not read this file."));
        return;
      }
      resolve(r);
    };
    fr.onerror = () => reject(new Error("Could not read this file."));
    fr.readAsDataURL(file);
  });
}
