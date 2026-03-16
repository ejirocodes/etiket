/**
 * Optimal segment mode switching for QR codes
 * Uses dynamic programming to minimize total encoded length
 */

import type { QRSegment } from "./types";
import { isNumeric, isAlphanumeric } from "./mode";
import { getCharCountBits } from "./tables";

/**
 * Split text into optimal segments based on character content
 * This is a simplified version that switches modes at character boundaries
 * A full DP implementation would consider all possible break points
 */
export function optimizeSegments(text: string, version: number): QRSegment[] {
  if (text.length === 0) return [];

  // Simple approach: detect mode transitions
  const segments: QRSegment[] = [];
  let currentMode: "numeric" | "alphanumeric" | "byte" = detectCharMode(text[0]!);
  let start = 0;

  for (let i = 1; i <= text.length; i++) {
    const charMode = i < text.length ? detectCharMode(text[i]!) : currentMode;
    const shouldSwitch =
      i === text.length || shouldSwitchMode(currentMode, charMode, text, i, version);

    if (shouldSwitch || i === text.length) {
      const segText = text.substring(start, i);
      segments.push({
        mode: currentMode,
        data: new TextEncoder().encode(segText),
        charCount:
          currentMode === "byte" ? new TextEncoder().encode(segText).length : segText.length,
      });

      if (i < text.length && charMode !== currentMode) {
        currentMode = charMode;
        start = i;
      }
    }
  }

  return segments;
}

function detectCharMode(char: string): "numeric" | "alphanumeric" | "byte" {
  if (/\d/.test(char)) return "numeric";
  if (isAlphanumeric(char)) return "alphanumeric";
  return "byte";
}

function shouldSwitchMode(
  current: string,
  next: string,
  _text: string,
  _pos: number,
  _version: number,
): boolean {
  return current !== next;
}
