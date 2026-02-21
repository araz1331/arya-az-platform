import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, X, Sparkles, Mic, Square, CheckCircle2, Shield, Globe, Paperclip, FileText, Image as ImageIcon, Plus, MessageSquare, Pencil, Trash2, ChevronLeft, PanelLeftOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PendingFile {
  file: File;
  preview: string | null;
}

interface Message {
  role: "user" | "model";
  content: string;
  updated?: boolean;
  updateTarget?: "public" | "private" | "ask" | null;
  fileUrl?: string | null;
  fileUrls?: string[];
}

interface Session {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
}

function extractFileUrl(content: string): { text: string; fileUrl: string | null } {
  const match = content.match(/^\[file:(https?:\/\/[^\]]+)\]\s*/);
  if (match) {
    return { text: content.replace(match[0], "").trim(), fileUrl: match[1] };
  }
  return { text: content, fileUrl: null };
}

function extractMultipleFileUrls(content: string): { text: string; fileUrls: string[] } {
  const urls: string[] = [];
  let text = content;
  const pattern = /\[file:(https?:\/\/[^\]]+)\]\s*/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    urls.push(match[1]);
    text = text.replace(match[0], "");
  }
  return { text: text.trim(), fileUrls: urls };
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
}

export default function OwnerAssistant({ autoOpen = false, inline = false }: { autoOpen?: boolean; inline?: boolean } = {}) {
  const [open, setOpen] = useState(autoOpen || inline);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userJustSentRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (autoOpen || inline) setOpen(true);
  }, [autoOpen, inline]);

  useEffect(() => {
    if (open && !sessionsLoaded) {
      loadSessions();
    }
  }, [open, sessionsLoaded]);

  useEffect(() => {
    if (open && sessionsLoaded) {
      loadHistory(activeSessionId);
    }
  }, [activeSessionId, sessionsLoaded]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (userJustSentRef.current) {
      userJustSentRef.current = false;
      textareaRef.current?.focus();
      container.scrollTop = container.scrollHeight;
      return;
    }
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (isNearBottom) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [messages]);

  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading]);

  useEffect(() => {
    return () => {
      pendingFiles.forEach(pf => { if (pf.preview) URL.revokeObjectURL(pf.preview); });
    };
  }, [pendingFiles]);

  const loadSessions = async () => {
    try {
      const migrateRes = await fetch("/api/owner-chat/sessions/migrate-orphans", {
        method: "POST",
        credentials: "include",
      });

      const res = await fetch("/api/owner-chat/sessions", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const loadedSessions: Session[] = data.sessions || [];
        setSessions(loadedSessions);
        if (loadedSessions.length > 0 && !activeSessionId) {
          setActiveSessionId(loadedSessions[0].id);
        }
      }
      setSessionsLoaded(true);
    } catch {
      setSessionsLoaded(true);
    }
  };

  const loadHistory = async (sessionId: string | null) => {
    try {
      const url = sessionId
        ? `/api/owner-chat/history?sessionId=${sessionId}`
        : "/api/owner-chat/history";
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.messages?.length) {
          setMessages(data.messages.map((m: any) => {
            const { text, fileUrls } = extractMultipleFileUrls(m.content);
            const { fileUrl } = extractFileUrl(m.content);
            return { role: m.role, content: text || m.content, fileUrl: fileUrls.length ? null : fileUrl, fileUrls: fileUrls.length ? fileUrls : undefined };
          }));
        } else {
          setMessages([]);
          if (sessions.length === 0 && !sessionId) {
            triggerDiscoveryInterview();
          }
        }
      }
      setHistoryLoaded(true);
    } catch {
      setHistoryLoaded(true);
    }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch("/api/owner-chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: "New chat" }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(prev => [data.session, ...prev]);
        setActiveSessionId(data.session.id);
        setMessages([]);
        setShowSidebar(false);
      }
    } catch {
      toast({ title: "Failed to create new chat", variant: "destructive" });
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/owner-chat/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setSessions(prev => {
          const remaining = prev.filter(s => s.id !== sessionId);
          if (activeSessionId === sessionId) {
            if (remaining.length > 0) {
              setActiveSessionId(remaining[0].id);
            } else {
              setActiveSessionId(null);
              setMessages([]);
            }
          }
          return remaining;
        });
      }
    } catch {
      toast({ title: "Failed to delete chat", variant: "destructive" });
    }
  };

  const renameSession = async (sessionId: string, title: string) => {
    try {
      await fetch(`/api/owner-chat/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title }),
      });
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title } : s));
      setEditingSessionId(null);
    } catch {
      toast({ title: "Failed to rename", variant: "destructive" });
    }
  };

  const switchSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setShowSidebar(false);
  };

  const triggerDiscoveryInterview = async () => {
    setIsLoading(true);
    try {
      const session = await createSessionIfNeeded();
      const formData = new FormData();
      formData.append("message", "Hello");
      if (session) formData.append("sessionId", session);
      const res = await fetch("/api/owner-chat", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setMessages([{ role: "model", content: data.reply }]);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const createSessionIfNeeded = async (): Promise<string | null> => {
    if (activeSessionId) return activeSessionId;
    try {
      const res = await fetch("/api/owner-chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: "New chat" }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(prev => [data.session, ...prev]);
        setActiveSessionId(data.session.id);
        return data.session.id;
      }
    } catch {}
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    const newFiles: PendingFile[] = [];
    let rejected = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!allowedTypes.includes(file.type)) {
        rejected++;
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        rejected++;
        continue;
      }
      if (pendingFiles.length + newFiles.length >= 10) {
        toast({ title: "Maximum 10 files at once", variant: "destructive" });
        break;
      }
      newFiles.push({
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      });
    }

    if (rejected > 0) {
      toast({ title: `${rejected} file(s) skipped — use JPEG, PNG, GIF, WebP, or PDF (max 10MB each)`, variant: "destructive" });
    }

    if (newFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...newFiles]);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => {
      const updated = [...prev];
      const removed = updated.splice(index, 1)[0];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return updated;
    });
  };

  const clearAllPendingFiles = () => {
    pendingFiles.forEach(pf => { if (pf.preview) URL.revokeObjectURL(pf.preview); });
    setPendingFiles([]);
  };

  const autoTitleSession = async (sessionId: string, userMessage: string, aiReply: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.title !== "New chat") return;
    try {
      const shortTitle = userMessage.slice(0, 40).replace(/\n/g, " ").trim() || "Chat";
      await renameSession(sessionId, shortTitle);
    } catch {}
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text && pendingFiles.length === 0) return;
    if (isLoading) return;

    const currentFiles = [...pendingFiles];

    setInput("");
    setPendingFiles([]);
    userJustSentRef.current = true;

    const fileNames = currentFiles.map(f => f.file.name).join(", ");
    const userMsg: Message = {
      role: "user",
      content: text || (currentFiles.length > 0 ? `Sent ${currentFiles.length} file(s): ${fileNames}` : ""),
      fileUrls: currentFiles.filter(f => f.preview).map(f => f.preview!),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const sessionId = await createSessionIfNeeded();

      const formData = new FormData();
      if (text) formData.append("message", text);
      if (sessionId) formData.append("sessionId", sessionId);
      currentFiles.forEach(pf => {
        formData.append("files", pf.file);
      });

      const res = await fetch("/api/owner-chat", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Owner chat error:", res.status, errText);
        if (res.status === 401) {
          setMessages(prev => [...prev, { role: "model", content: "Session expired. Please log out and log back in." }]);
          return;
        }
        throw new Error(errText);
      }
      const data = await res.json();

      if (data.fileUrls?.length) {
        setMessages(prev => {
          const updated = [...prev];
          const lastUserIdx = updated.length - 1 - [...updated].reverse().findIndex(m => m.role === "user");
          if (lastUserIdx >= 0) {
            updated[lastUserIdx] = { ...updated[lastUserIdx], fileUrls: data.fileUrls };
          }
          return updated;
        });
        currentFiles.forEach(pf => { if (pf.preview) URL.revokeObjectURL(pf.preview); });
      } else if (data.fileUrl) {
        setMessages(prev => {
          const updated = [...prev];
          const lastUserIdx = updated.length - 1 - [...updated].reverse().findIndex(m => m.role === "user");
          if (lastUserIdx >= 0) {
            updated[lastUserIdx] = { ...updated[lastUserIdx], fileUrl: data.fileUrl };
          }
          return updated;
        });
        currentFiles.forEach(pf => { if (pf.preview) URL.revokeObjectURL(pf.preview); });
      }

      setMessages(prev => [...prev, { role: "model", content: data.reply, updated: data.updated, updateTarget: data.updateTarget }]);

      if (sessionId) {
        autoTitleSession(sessionId, text, data.reply);
      }
    } catch (err: any) {
      console.error("Owner chat send error:", err);
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

  const renderFileAttachments = (msg: Message) => {
    const urls = msg.fileUrls || (msg.fileUrl ? [msg.fileUrl] : []);
    if (urls.length === 0) return null;

    return (
      <div className={`flex flex-wrap gap-1.5 mb-2 ${urls.length > 1 ? "grid grid-cols-2" : ""}`}>
        {urls.map((url, idx) =>
          isImageUrl(url) ? (
            <img
              key={idx}
              src={url}
              alt="Uploaded"
              className="rounded-lg max-h-[140px] w-auto object-contain cursor-pointer"
              onClick={() => window.open(url, "_blank")}
              data-testid={`image-attachment-${idx}`}
            />
          ) : (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[hsl(260,80%,75%)] underline"
              data-testid={`file-attachment-${idx}`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>File {idx + 1}</span>
            </a>
          )
        )}
      </div>
    );
  };

  if (!open && !inline) {
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

  if (!open) return null;

  const containerClass = inline
    ? "w-full h-[480px] sm:h-[520px] flex flex-col shadow-lg border border-border/50 bg-[hsl(240,20%,8%)] text-white overflow-hidden rounded-md"
    : "fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[540px] max-h-[calc(100vh-6rem)] flex flex-col shadow-2xl border-border/50 bg-[hsl(240,20%,8%)] text-white overflow-hidden";

  const renderSidebar = () => (
    <div className="absolute inset-0 z-10 bg-[hsl(240,20%,6%)] flex flex-col animate-in slide-in-from-left-2 duration-200" data-testid="panel-session-sidebar">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
        <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Chat History</span>
        <Button size="icon" variant="ghost" onClick={() => setShowSidebar(false)} className="text-white/50 w-7 h-7" data-testid="button-close-sidebar">
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      <div className="px-2 py-2">
        <Button
          onClick={createNewSession}
          size="sm"
          className="w-full gap-2 bg-[hsl(260,70%,50%)] hover:bg-[hsl(260,70%,55%)] text-white text-xs"
          data-testid="button-new-chat"
        >
          <Plus className="w-3.5 h-3.5" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-0.5" data-testid="container-session-list">
        {sessions.map(session => (
          <div
            key={session.id}
            className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
              session.id === activeSessionId
                ? "bg-[hsl(260,50%,30%)] text-white"
                : "hover:bg-white/5 text-white/60"
            }`}
            data-testid={`session-item-${session.id}`}
          >
            {editingSessionId === session.id ? (
              <input
                autoFocus
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onBlur={() => renameSession(session.id, editTitle)}
                onKeyDown={e => { if (e.key === "Enter") renameSession(session.id, editTitle); if (e.key === "Escape") setEditingSessionId(null); }}
                className="flex-1 bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-xs text-white outline-none"
                data-testid={`input-rename-session-${session.id}`}
              />
            ) : (
              <>
                <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-50" />
                <span
                  onClick={() => switchSession(session.id)}
                  className="flex-1 text-xs truncate"
                  data-testid={`text-session-title-${session.id}`}
                >
                  {session.title}
                </span>
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingSessionId(session.id); setEditTitle(session.title); }}
                    className="p-0.5 rounded hover:bg-white/10"
                    data-testid={`button-rename-session-${session.id}`}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                    className="p-0.5 rounded hover:bg-red-500/20 text-red-400"
                    data-testid={`button-delete-session-${session.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {sessions.length === 0 && (
          <p className="text-xs text-white/30 text-center py-4">No chats yet</p>
        )}
      </div>
    </div>
  );

  return (
    <Card className={containerClass} data-testid="panel-owner-assistant">
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/10 bg-gradient-to-r from-[hsl(260,60%,20%)] to-[hsl(220,60%,18%)]">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowSidebar(true)}
              className="text-white/60 w-7 h-7"
              data-testid="button-open-sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </Button>
            <Sparkles className="w-4 h-4 text-[hsl(260,85%,70%)]" />
            <span className="font-semibold text-sm truncate" data-testid="text-assistant-title">
              {sessions.find(s => s.id === activeSessionId)?.title || "Arya — Assistant"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={createNewSession}
              className="text-white/60 w-7 h-7"
              title="New chat"
              data-testid="button-new-chat-header"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Badge variant="outline" className="text-[10px] border-white/20 text-white/60 no-default-hover-elevate no-default-active-elevate">Private</Badge>
            {!inline && (
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)} className="text-white/60 hover-elevate w-7 h-7" data-testid="button-owner-assistant-close">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {showSidebar && renderSidebar()}

        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" data-testid="container-assistant-messages">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center text-white/40 px-4">
              <Sparkles className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium mb-1">Your private assistant</p>
              <p className="text-xs">Ask me anything — send text, voice, images, or documents. You can attach multiple files at once.</p>
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
                {msg.updated && msg.updateTarget === "public" && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-emerald-400 text-xs font-medium" data-testid={`badge-public-${i}`}>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Public knowledge updated</span>
                  </div>
                )}
                {msg.updated && msg.updateTarget === "private" && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-amber-400 text-xs font-medium" data-testid={`badge-private-${i}`}>
                    <Shield className="w-3.5 h-3.5" />
                    <span>Saved to Private Vault</span>
                  </div>
                )}
                {msg.updated && !msg.updateTarget && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-emerald-400 text-xs font-medium" data-testid={`badge-updated-${i}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Knowledge base updated</span>
                  </div>
                )}
                {renderFileAttachments(msg)}
                {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
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
          {pendingFiles.length > 0 && (
            <div className="mb-2 space-y-1" data-testid="container-pending-files">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40">{pendingFiles.length} file(s) attached</span>
                {pendingFiles.length > 1 && (
                  <button onClick={clearAllPendingFiles} className="text-[10px] text-white/40 underline" data-testid="button-clear-all-files">Clear all</button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pendingFiles.map((pf, idx) => (
                  <div key={idx} className="relative group" data-testid={`pending-file-${idx}`}>
                    {pf.preview ? (
                      <img src={pf.preview} alt="Preview" className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-white/10 flex flex-col items-center justify-center">
                        <FileText className="w-4 h-4 text-white/60" />
                        <span className="text-[8px] text-white/40 mt-0.5 truncate max-w-[40px]">{pf.file.name.split('.').pop()}</span>
                      </div>
                    )}
                    <button
                      onClick={() => removePendingFile(idx)}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center invisible group-hover:visible"
                      data-testid={`button-remove-file-${idx}`}
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-end gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-file-upload"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="text-white/50 shrink-0"
              data-testid="button-attach-file"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Arya anything..."
              className="resize-none border-white/15 bg-white/5 text-white placeholder:text-white/30 text-sm min-h-[40px] max-h-[100px] focus-visible:ring-[hsl(260,70%,50%)]"
              rows={1}
              disabled={isLoading}
              data-testid="input-owner-assistant-message"
            />
            {(input.trim() || pendingFiles.length > 0) ? (
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
      </div>
    </Card>
  );
}
