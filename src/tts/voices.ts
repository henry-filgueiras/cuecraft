/**
 * The voices Kokoro ships, mirrored from the pinned `kokoro-js` package.
 *
 * This list is duplicated deliberately. Validating a voice name by loading the model
 * would make every voice typo cost a 325 MB model load, and would make the ordinary unit
 * suite depend on a bootstrapped machine. The integration test asserts this list still
 * matches the runtime's own, so moving the `kokoro-js` pin cannot let the two drift
 * apart silently.
 *
 * Voice data lives inside the npm package rather than alongside the weights — see
 * archaeology/decisions/0008-*.md.
 */
export const KOKORO_VOICES = [
  // American English
  "af_heart",
  "af_alloy",
  "af_aoede",
  "af_bella",
  "af_jessica",
  "af_kore",
  "af_nicole",
  "af_nova",
  "af_river",
  "af_sarah",
  "af_sky",
  "am_adam",
  "am_echo",
  "am_eric",
  "am_fenrir",
  "am_liam",
  "am_michael",
  "am_onyx",
  "am_puck",
  "am_santa",
  // British English
  "bf_alice",
  "bf_emma",
  "bf_isabella",
  "bf_lily",
  "bm_daniel",
  "bm_fable",
  "bm_george",
  "bm_lewis",
] as const;

export type KokoroVoice = (typeof KOKORO_VOICES)[number];

/**
 * Kokoro's highest-graded voice, and the only one upstream grades `A` overall.
 */
export const DEFAULT_VOICE = "af_heart" satisfies KokoroVoice;

export function isKokoroVoice(value: string): value is KokoroVoice {
  return (KOKORO_VOICES as readonly string[]).includes(value);
}
