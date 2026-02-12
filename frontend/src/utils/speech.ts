import { Lang } from "../i18n/strings";

const SPEECH_LANG_MAP: Record<Lang, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};

export function getSpeechLang(lang?: Lang, fallback = "en-IN") {
  if (!lang) return fallback;
  return SPEECH_LANG_MAP[lang] || fallback;
}

export function isSpeechRecognitionSupported() {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported() {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function pickVoiceForLang(lang: string) {
  if (!isSpeechSynthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;
  const exact = voices.find((v) => v.lang === lang);
  if (exact) return exact;
  const prefix = lang.split("-")[0];
  return voices.find((v) => v.lang.startsWith(prefix)) || null;
}

export function cancelSpeech() {
  if (!isSpeechSynthesisSupported()) return;
  window.speechSynthesis.cancel();
}

export function speakText(text: string, lang: string) {
  if (!isSpeechSynthesisSupported()) return false;
  const trimmed = (text || "").trim();
  if (!trimmed) return false;
  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = lang;
  const voice = pickVoiceForLang(lang);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}
