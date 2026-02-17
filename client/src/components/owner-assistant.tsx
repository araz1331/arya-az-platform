import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, X, Sparkles, Mic, Square, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  role: "user" | "model";
  content: string;
  updated?: boolean;
}

export default function OwnerAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open && !historyLoaded) {
      loadHistory();
    }
  }, [open, historyLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/owner-chat/history", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.messages?.length) {
          setMessages(data.messages.map((m: any) => ({ role: m.role, content: m.content })));
        }
      }
      setHistoryLoaded(true);
    } catch {
      setHistoryLoaded(true);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setIsLoading(true);

    try {
      const res = await apiRequest("POST", "/api/owner-chat", { message: text });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "model", content: data.reply, updated: data.updated }]);
    } catch {
      setMessages(prev => [...prev, { role: "model", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 1000) return;

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          if (!res.ok) throw new Error("Transcription failed");
          const data = await res.json();
          if (data.text?.trim()) {
            setInput(data.text.trim());
          } else {
            toast({ title: "Speech not recognized. Please try again." });
          }
        } catch {
          toast({ title: "Microphone error", variant: "destructive" });
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast({ title: "Please allow microphone access", variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full shadow-2xl bg-gradient-to-r from-[hsl(260,85%,55%)] to-[hsl(220,85%,55%)] border-0 text-white gap-2"
        size="lg"
        data-testid="button-owner-assistant-open"
      >
        <Sparkles className="w-5 h-5" />
        <span className="hidden sm:inline">Assistant</span>
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)] flex flex-col shadow-2xl border-border/50 bg-[hsl(240,20%,8%)] text-white overflow-hidden" data-testid="panel-owner-assistant">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[hsl(260,60%,20%)] to-[hsl(220,60%,18%)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[hsl(260,85%,70%)]" />
          <span className="font-semibold text-sm" data-testid="text-assistant-title">Arya — Executive Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[10px] border-white/20 text-white/60 no-default-hover-elevate no-default-active-elevate">Private</Badge>
          <Button size="icon" variant="ghost" onClick={() => setOpen(false)} className="text-white/60 hover-elevate" data-testid="button-owner-assistant-close">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" data-testid="container-assistant-messages">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center text-white/40 px-4">
            <Sparkles className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium mb-1">Your private assistant</p>
            <p className="text-xs">Ask me anything about your business, marketing ideas, or how to improve your AI receptionist.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[hsl(260,70%,45%)] text-white"
                  : "bg-white/10 text-white/90"
              }`}
              data-testid={`message-${msg.role}-${i}`}
            >
              {msg.updated && (
                <div className="flex items-center gap-1.5 mb-1.5 text-emerald-400 text-xs font-medium" data-testid={`badge-updated-${i}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Knowledge base updated</span>
                </div>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-white/60" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="px-3 py-3 border-t border-white/10 bg-[hsl(240,20%,10%)]">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Arya anything..."
            className="resize-none border-white/15 bg-white/5 text-white placeholder:text-white/30 text-sm min-h-[40px] max-h-[100px] focus-visible:ring-[hsl(260,70%,50%)]"
            rows={1}
            disabled={isLoading}
            data-testid="input-owner-assistant-message"
          />
          {input.trim() ? (
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={isLoading}
              className="bg-[hsl(260,70%,50%)] text-white shrink-0"
              data-testid="button-owner-assistant-send"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          ) : (
            <Button
              size="icon"
              variant={isRecording ? "destructive" : "default"}
              onClick={toggleRecording}
              disabled={isLoading || isTranscribing}
              className={`shrink-0 ${isRecording ? "ring-2 ring-destructive/30" : "bg-[hsl(260,70%,50%)] text-white"}`}
              data-testid="button-owner-assistant-mic"
            >
              {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
