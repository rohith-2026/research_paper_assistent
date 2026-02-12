import { Mic, MicOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { getSpeechLang, isSpeechRecognitionSupported } from "../../utils/speech";

type VoiceButtonProps = {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
  lang?: string;
};

export default function VoiceButton({
  value,
  onChange,
  disabled,
  className,
  lang,
}: VoiceButtonProps) {
  const recognitionRef = useRef<any>(null);
  const baseValueRef = useRef<string>("");
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const { lang: uiLang } = useI18n();
  const speechLang = useMemo(() => (lang ? lang : getSpeechLang(uiLang)), [lang, uiLang]);

  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      setIsSupported(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechLang;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || "";
        if (result.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }
      const parts = [baseValueRef.current, finalText.trim(), interimText.trim()].filter(Boolean);
      onChange(parts.join(" "));
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [speechLang, onChange]);

  const toggleListening = () => {
    if (!recognitionRef.current || disabled) return;
    if (isListening) {
      recognitionRef.current.stop();
      return;
    }
    baseValueRef.current = value.trim();
    recognitionRef.current.start();
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={className || "btn-secondary px-3 py-2 rounded-xl"}
      disabled={disabled || !isSupported}
      title={
        !isSupported
          ? "Speech recognition not supported in this browser"
          : isListening
          ? "Stop listening"
          : "Start listening"
      }
      aria-label={isListening ? "Stop listening" : "Start listening"}
    >
      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  );
}
