import { useState, useRef, useCallback, useEffect } from "react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Mic, Square, RotateCcw, Check, AlertCircle, Volume2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Sentence } from "@shared/schema";
import type { TranslationKey } from "@/lib/i18n";

interface RecorderWidgetProps {
  sentence: Sentence | null;
  currentIndex: number;
  totalInSession: number;
  totalRecorded: number;
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onSkip: () => void;
  isSubmitting: boolean;
}

const categoryKeyMap: Record<string, TranslationKey> = {
  anchor: "categoryAnchor",
  chat: "categoryChat",
  news: "categoryNews",
  question: "categoryQuestion",
  numbers: "categoryNumbers",
  hard_words: "categoryHardWords",
  commands: "categoryCommands",
  emotions: "categoryEmotions",
  daily: "categoryDaily",
  tech: "categoryTech",
  culture: "categoryCulture",
  travel: "categoryTravel",
  food: "categoryFood",
  sports: "categorySports",
  weather: "categoryWeather",
  health: "categoryHealth",
  education: "categoryEducation",
  business: "categoryBusiness",
  nature: "categoryNature",
  family: "categoryFamily",
};

export default function RecorderWidget({
  sentence,
  currentIndex,
  totalInSession,
  totalRecorded,
  onRecordingComplete,
  onSkip,
  isSubmitting,
}: RecorderWidgetProps) {
  const { t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const milestone1 = 5;
  const milestone2 = 20;

  const getNextMilestone = () => {
    if (totalRecorded < milestone1) return milestone1;
    if (totalRecorded < milestone2) return milestone2;
    const past20 = totalRecorded - 20;
    const next50Block = Math.ceil((past20 + 1) / 50) * 50 + 20;
    return next50Block;
  };

  const nextMilestone = getNextMilestone();

  const getPrevMilestone = () => {
    if (totalRecorded < milestone1) return 0;
    if (totalRecorded < milestone2) return milestone1;
    const past20 = totalRecorded - 20;
    const completed50Blocks = Math.floor(past20 / 50);
    return 20 + completed50Blocks * 50;
  };

  const prevMilestone = getPrevMilestone();
  const progressPercent = ((totalRecorded - prevMilestone) / (nextMilestone - prevMilestone)) * 100;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(t("micNotSupported"));
        return;
      }

      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permResult = await navigator.permissions.query({ name: "microphone" as PermissionName });
          if (permResult.state === "denied") {
            setError(t("micPermissionDenied"));
            return;
          }
        } catch (_) {}
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        }
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const updateVolume = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setVolume(avg / 255);
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const actualMime = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: actualMime });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        stream.getTracks().forEach(t => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setVolume(0);
        audioContext.close();
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("[mic]", err?.name, err?.message);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setError(t("micPermissionDenied"));
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setError(t("micNotSupported"));
      } else {
        setError(t("micPermissionError"));
      }
    }
  }, [audioUrl, t]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const handleSubmit = () => {
    if (!audioBlob || !sentence) return;

    const minDuration = sentence.wordCount * 0.3;
    if (recordingTime < minDuration) {
      setError(t("tooFastError").replace("{seconds}", String(Math.ceil(minDuration))));
      return;
    }

    onRecordingComplete(audioBlob, recordingTime);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const handleRetry = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
    setError(null);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const isEmotional = sentence?.emotion && sentence.emotion !== "neutral";
  const emotionBorderColor = sentence?.emotion === "angry"
    ? "border-destructive"
    : sentence?.emotion === "happy"
    ? "border-[hsl(140,60%,40%)]"
    : sentence?.emotion === "sad"
    ? "border-[hsl(220,60%,50%)]"
    : "";

  const getCategoryLabel = (cat: string): string => {
    const key = categoryKeyMap[cat];
    return key ? t(key) : t("categoryOther");
  };

  if (!sentence) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t("loadingSentences")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("progress")}</span>
            <Badge variant="secondary" className="text-xs">
              {totalRecorded}/{nextMilestone}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {totalRecorded < milestone1 ? (
              <span>{milestone1} — 200 Token</span>
            ) : totalRecorded < milestone2 ? (
              <span>{milestone2} — 1,000 Token</span>
            ) : (
              <span>{nextMilestone} — 1,000 Token</span>
            )}
          </div>
        </div>
        <Progress value={Math.min(progressPercent, 100)} className="h-2" data-testid="progress-milestone" />
      </div>

      <Card className={`p-6 ${isEmotional ? `border-2 ${emotionBorderColor}` : ''}`}>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <Badge variant="outline" className="text-xs capitalize">
            {getCategoryLabel(sentence.category)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1} / {totalInSession}
          </span>
        </div>

        {isEmotional && sentence.context && (
          <div className="mb-4 p-3 rounded-md bg-destructive/5 border border-destructive/20 text-sm text-muted-foreground italic">
            {sentence.context}
          </div>
        )}

        <p className="text-xl sm:text-2xl font-medium leading-relaxed mb-6 text-center py-4" data-testid="text-sentence">
          "{sentence.text}"
        </p>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {isRecording && (
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full bg-primary"
                  animate={{
                    height: `${Math.max(4, volume * 32 * (0.5 + Math.random()))}px`,
                  }}
                  transition={{ duration: 0.1 }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          {!isRecording && !audioBlob && (
            <Button
              size="lg"
              onClick={startRecording}
              className="text-lg px-8 py-6 gap-2"
              data-testid="button-start-recording"
            >
              <Mic className="w-5 h-5" />
              {t("record")}
            </Button>
          )}

          {isRecording && (
            <>
              <span className="text-2xl font-mono text-destructive font-semibold tabular-nums" data-testid="text-recording-time">
                {formatTime(recordingTime)}
              </span>
              <Button
                size="lg"
                variant="destructive"
                onClick={stopRecording}
                className="text-lg px-8 py-6 gap-2"
                data-testid="button-stop-recording"
              >
                <Square className="w-4 h-4" />
                {t("stop")}
              </Button>
            </>
          )}

          {audioBlob && !isRecording && (
            <div className="flex flex-col items-center gap-4 w-full">
              {audioUrl && (
                <audio controls src={audioUrl} className="w-full max-w-sm" data-testid="audio-playback" />
              )}
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <Button
                  variant="outline"
                  onClick={handleRetry}
                  className="gap-2"
                  data-testid="button-retry-recording"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t("retry")}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="gap-2"
                  data-testid="button-submit-recording"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {t("confirm")}
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">
                {t("duration")}: {formatTime(recordingTime)} | {t("size")}: {(audioBlob.size / 1024).toFixed(0)} KB
              </span>
            </div>
          )}
        </div>
      </Card>

      {!isRecording && !audioBlob && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-muted-foreground"
            data-testid="button-skip-sentence"
          >
            {t("skipSentence")}
          </Button>
        </div>
      )}
    </div>
  );
}
