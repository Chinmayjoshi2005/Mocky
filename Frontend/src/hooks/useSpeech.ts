"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser-native text-to-speech using the Web Speech API.
 * No backend call, no cost, works offline in Chromium/Safari/Firefox.
 */
export function useSpeech() {
  const [supported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, opts: { rate?: number; pitch?: number; lang?: string } = {}) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      // Cancel any in-flight utterance so we never queue up two.
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = opts.rate ?? 1.0;
      utterance.pitch = opts.pitch ?? 1.0;
      utterance.lang = opts.lang ?? "en-US";

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    []
  );

  // Cleanup on unmount so audio doesn't keep playing after navigation.
  useEffect(() => () => stop(), [stop]);

  return { speak, stop, speaking, supported };
}