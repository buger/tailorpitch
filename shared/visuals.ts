// The site's visual-generation preference; account credentials remain server-only.
// A connected Manus fal.ai integration is not an app runtime API credential.
export const DEFAULT_VISUAL_PROVIDER = "fal.ai" as const;
export const DEFAULT_VISUAL_MODEL = "google/nano-banana-2.1";
export function quietHeroInput(prompt: string) {
  if (prompt.trim().length < 10 || prompt.length > 5000)
    throw Error("Provide a concise visual brief.");
  return {
    prompt,
    num_images: 1,
    aspect_ratio: "16:9",
    output_format: "webp",
    resolution: "2K",
    enable_web_search: false,
    thinking_level: "medium",
  };
}
