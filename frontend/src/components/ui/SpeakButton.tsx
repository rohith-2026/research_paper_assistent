import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { cancelSpeech, getSpeechLang, isSpeechSynthesisSupported, pickVoiceForLang } from "../../utils/speech";
import { getStoredSettings, SETTINGS_KEY } from "../../utils/settings";

type SpeakButtonProps = {
  text: string;
  className?: string;
};

export default function SpeakButton({ text, className }: SpeakButtonProps) {
  const { lang: uiLang, t } = useI18n();
  const speechLang = useMemo(() => getSpeechLang(uiLang), [uiLang]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsRate, setTtsRate] = useState(1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported(isSpeechSynthesisSupported());
  }, []);

  useEffect(() => {
    const apply = () => {
      const settings = getStoredSettings();
      const root = document.documentElement;
      const dsEnabled = root.dataset.ttsEnabled;
      const dsRate = root.dataset.ttsRate;
      const enabled =
        typeof settings?.ttsEnabled === "boolean"
          ? settings.ttsEnabled
          : dsEnabled
          ? dsEnabled === "true"
          : false;
      const rate =
        typeof settings?.ttsRate === "number"
          ? settings.ttsRate
          : dsRate
          ? Number(dsRate)
          : 1;
      setTtsEnabled(enabled);
      setTtsRate(Number.isFinite(rate) ? rate : 1);
    };
    apply();
    const handler = (e: StorageEvent) => {
      if (e.key === SETTINGS_KEY) apply();
    };
    window.addEventListener("storage", handler);
    const observer = new MutationObserver(() => apply());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-tts-enabled", "data-tts-rate"],
    });
    return () => window.removeEventListener("storage", handler);
  }, []);

  useEffect(() => {
    return () => {
      if (!isSpeechSynthesisSupported()) return;
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = () => {
    cancelSpeech();
    setIsSpeaking(false);
  };

  const speak = () => {
    if (!isSpeechSynthesisSupported()) return;
    if (!ttsEnabled) return;
    const trimmed = (text || "").trim();
    if (!trimmed) return;

    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.lang = speechLang;
    utterance.rate = ttsRate;
    const voice = pickVoiceForLang(speechLang);
    if (voice) utterance.voice = voice;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const toggle = () => {
    if (!isSupported || !ttsEnabled) return;
    if (isSpeaking) {
      stop();
      return;
    }
    speak();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={className || "btn-secondary rounded-xl px-3 py-1.5 text-xs"}
      disabled={!isSupported || !ttsEnabled}
      title={
        !isSupported
          ? t("Speech synthesis not supported in this browser")
          : !ttsEnabled
          ? t("Read aloud disabled in settings")
          : isSpeaking
          ? t("Stop reading")
          : t("Read aloud")
      }
      aria-label={isSpeaking ? t("Stop reading") : t("Read aloud")}
    >
      {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
    </button>
  );
}
