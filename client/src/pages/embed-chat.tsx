import { useState, useRef, useEffect } from "react";
import { Mic, Send, Loader2, Square, X } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface ProfileData {
  id: string;
  display_name: string;
  profession: string;
  profession_ru: string;
  profession_en: string;
  theme_color: string;
  profile_image_url: string | null;
}

function generateSessionId() {
  return "embed_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

const GREETINGS: Record<string, (name: string, prof: string) => string> = {
  az: (name, prof) => `Salam! Mən ${name}, ${prof}. Sizə necə kömək edə bilərəm?`,
  ru: (name, prof) => `Здравствуйте! Я ${name}, ${prof}. Чем могу помочь?`,
  en: (name, prof) => `Hello! I'm ${name}, ${prof}. How can I help you?`,
};

const PLACEHOLDERS: Record<string, string> = {
  az: "Mesaj yazın...",
  ru: "Напишите сообщение...",
  en: "Type a message...",
};

export default function EmbedChat({ slug }: { slug: string }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [language, setLanguage] = useState<"az" | "ru" | "en">("az");
  const [profileLoading, setProfileLoading] = useState(true);
  const [pendingVoiceText, setPendingVoiceText] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const sessionIdRef = useRef(generateSessionId());
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get("lang");
    if (langParam === "ru" || langParam === "en" || langParam === "az") {
      setLanguage(langParam);
    }
    const autoOpen = params.get("open");
    if (autoOpen === "1" || autoOpen === "true") {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!slug) return;
    setProfileLoading(true);

    const origin = window.location.origin;
    fetch(`${origin}/api/smart-profile/by-slug/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(data => {
        setProfile({
          id: data.id,
          display_name: data.display_name,
          profession: data.profession,
          profession_ru: data.profession_ru,
          profession_en: data.profession_en,
          theme_color: data.theme_color || "#2563EB",
          profile_image_url: data.profile_image_url,
        });
        const greetFn = GREETINGS[language] || GREETINGS.az;
        setMessages([{ role: "assistant", text: greetFn(data.display_name, data.profession) }]);
        setProfileLoading(false);
      })
      .catch(() => {
        setProfileLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!profile) return;
    const greetFn = GREETINGS[language] || GREETINGS.az;
    const prof = language === "ru" && profile.profession_ru ? profile.profession_ru
      : language === "en" && profile.profession_en ? profile.profession_en
      : profile.profession;
    setMessages(prev => {
      if (prev.length <= 1) return [{ role: "assistant", text: greetFn(profile.display_name, prof) }];
      return [{ role: "assistant", text: greetFn(profile.display_name, prof) }, ...prev.slice(1)];
    });
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  const logWidgetMessage = (pId: string, sId: string, role: string, content: string, contentType: string) => {
    const origin = window.location.origin;
    fetch(`${origin}/api/widget-messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: pId, sessionId: sId, role, content, contentType }),
    }).catch(() => {});
  };

  const sendMessage = async (text: string) => {
    if (!text || !profile) return;
    setIsLoading(true);
    try {
      const chatHistory = messages.filter(m => m.text).slice(-6).map(m => ({
        role: m.role,
        text: m.text,
      }));

      const origin = window.location.origin;
      const res = await fetch(`${origin}/api/smart-profile/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, message: text, language, history: chatHistory }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const reply = data.reply || "...";
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
      logWidgetMessage(profile.id, sessionIdRef.current, "user", text, "text");
      logWidgetMessage(profile.id, sessionIdRef.current, "assistant", reply, "text");
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Xəta baş verdi. Yenidən cəhd edin." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendText = () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const getSpeechLang = () => {
    const map: Record<string, string> = { az: "az-AZ", ru: "ru-RU", en: "en-US" };
    return map[language] || "az-AZ";
  };

  const metaBrowserMessages: Record<string, string> = {
    az: "Instagram/Facebook brauzeri mikrofona icazə vermir. Linki Safari və ya Chrome-da açın — orada mikrofon işləyəcək.",
    ru: "Браузер Instagram/Facebook не разрешает доступ к микрофону. Откройте ссылку в Safari или Chrome — там микрофон будет работать.",
    en: "Instagram/Facebook browser blocks microphone access. Open this link in Safari or Chrome — the mic will work there.",
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const ua = navigator.userAgent || "";
    const isMetaBrowser = /FBAN|FBAV|Instagram|FB_IAB/i.test(ua);
    if (isMetaBrowser) {
      setMessages(prev => [...prev, { role: "assistant", text: metaBrowserMessages[language] || metaBrowserMessages.en }]);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = getSpeechLang();
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;
      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim();
        if (transcript) setPendingVoiceText(transcript);
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch {}
  };

  const confirmPendingVoice = () => {
    if (!pendingVoiceText) return;
    const text = pendingVoiceText.trim();
    setPendingVoiceText(null);
    if (text) {
      setMessages(prev => [...prev, { role: "user", text }]);
      sendMessage(text);
    }
  };

  const themeColor = profile?.theme_color || "#2563EB";
  const initials = profile?.display_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const displayProfession = language === "ru" && profile?.profession_ru ? profile.profession_ru
    : language === "en" && profile?.profession_en ? profile.profession_en
    : profile?.profession || "";

  if (profileLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTop: `3px solid ${themeColor}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Profile not found</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: "#ffffff", color: "#1e293b" }} data-testid="embed-chat-container">
      <div style={{ background: themeColor, color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {profile.profile_image_url ? (
          <img src={profile.profile_image_url} alt={profile.display_name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)" }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
            {initials}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.display_name}</div>
          <div style={{ fontSize: 12, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayProfession}</div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {(["az", "ru", "en"] as const).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              style={{
                padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
                background: language === lang ? "rgba(255,255,255,0.3)" : "transparent",
                color: "#fff",
              }}
              data-testid={`embed-lang-${lang}`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }} data-testid="embed-messages">
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "85%",
              padding: "10px 14px",
              borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: m.role === "user" ? themeColor : "#f1f5f9",
              color: m.role === "user" ? "#fff" : "#1e293b",
              fontSize: 14,
              lineHeight: 1.5,
              wordBreak: "break-word" as const,
            }} data-testid={`embed-msg-${m.role}-${i}`}>
              {m.text}
            </div>
          </div>
        ))}

        {pendingVoiceText !== null && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ maxWidth: "85%", width: "100%" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Mic style={{ width: 12, height: 12 }} />
                {language === "ru" ? "Распознано — отредактируйте или отправьте:" : language === "en" ? "Recognized — edit or send:" : "Tanındı — düzəldin və ya göndərin:"}
              </div>
              <textarea
                value={pendingVoiceText}
                onChange={(e) => setPendingVoiceText(e.target.value)}
                style={{ width: "100%", padding: 8, fontSize: 14, borderRadius: 8, border: `1px solid ${themeColor}40`, background: `${themeColor}08`, resize: "none", outline: "none" }}
                rows={2}
                autoFocus
                data-testid="embed-input-pending-voice"
              />
              <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", marginTop: 4 }}>
                <button onClick={() => setPendingVoiceText(null)} style={{ padding: "4px 8px", background: "#f1f5f9", border: "none", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center" }} data-testid="embed-cancel-voice">
                  <X style={{ width: 14, height: 14, color: "#64748b" }} />
                </button>
                <button onClick={confirmPendingVoice} disabled={!pendingVoiceText?.trim()} style={{ padding: "4px 8px", background: themeColor, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center" }} data-testid="embed-confirm-voice">
                  <Send style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12, padding: 4 }}>
            <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
            {language === "ru" ? "Печатает..." : language === "en" ? "Typing..." : "Yazır..."}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ borderTop: "1px solid #e2e8f0", padding: "10px 12px", background: "#fff", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDERS[language] || PLACEHOLDERS.az}
            disabled={isLoading}
            style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none" }}
            data-testid="embed-input-message"
          />
          {input.length > 0 ? (
            <button
              onClick={handleSendText}
              disabled={isLoading}
              style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: themeColor, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              data-testid="embed-button-send"
            >
              <Send style={{ width: 16, height: 16 }} />
            </button>
          ) : null}
        </div>
        {input.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 10, gap: 6 }}>
            {isRecording && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="embed-recording-indicator">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }} />
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 18 }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 3, borderRadius: 2, background: "#ef4444",
                        animation: `soundWave 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 500 }}>
                  {{ az: "Dinləyirəm...", ru: "Слушаю...", en: "Listening..." }[language] || "Listening..."}
                </span>
              </div>
            )}
            <button
              onClick={toggleRecording}
              disabled={isLoading}
              style={{
                width: 48, height: 48, borderRadius: "50%", border: "none",
                background: isRecording ? "#ef4444" : themeColor,
                color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: isRecording ? "0 0 0 4px rgba(239,68,68,0.3)" : "none",
                transition: "all 0.2s",
              }}
              data-testid="embed-button-voice"
            >
              {isRecording ? <Square style={{ width: 18, height: 18 }} /> : <Mic style={{ width: 20, height: 20 }} />}
            </button>
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", padding: "4px 0 8px", fontSize: 10, color: "#94a3b8" }}>
        Powered by <a href="https://arya.az" target="_blank" rel="noopener noreferrer" style={{ color: themeColor, fontWeight: 700, textDecoration: "none" }}>Arya AI</a>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; overflow: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>
    </div>
  );
}
