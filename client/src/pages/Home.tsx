/* Signal & Sand: the working desk keeps the assistant, context, and composition tools in one calm English-first instrument. */
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  BookOpen,
  Loader2,
  Mic,
  Square,
  Check,
  ChevronLeft,
  CircleHelp,
  Clock3,
  Command,
  Compass,
  Copy,
  ExternalLink,
  FolderOpen,
  Globe2,
  History,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Radio,
  Settings2,
  Sparkles,
  SquarePen,
  TerminalSquare,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";

const STATIC_ASSET_ORIGIN = typeof window !== "undefined" && window.location.hostname.endsWith("github.io") ? "https://marokecho-jrrh7cuh.manus.space" : "";
const MARK_URL = `${STATIC_ASSET_ORIGIN}/manus-storage/marokecho-mark_ac6cc349.png`;
const HERO_URL = `${STATIC_ASSET_ORIGIN}/manus-storage/marokecho-atlas-hero_162916b8.png`;
const CARD_URL = `${STATIC_ASSET_ORIGIN}/manus-storage/marokecho-signal-card_2cf9ee52.png`;

const suggestions = [
  { icon: TerminalSquare, label: "Architect a product", prompt: "Help me design the architecture for a scalable web product." },
  { icon: BookOpen, label: "Explain the hard part", prompt: "Explain a complex concept in clear, practical language." },
  { icon: Sparkles, label: "Turn notes into a plan", prompt: "Turn this idea into a five-step execution plan." },
];

type Message = {
  id: string;
  role: "assistant" | "user";
  time: string;
  text: string;
};

const initialMessages: Message[] = [{
  id: "welcome",
  role: "assistant",
  time: "Now",
  text: "I am Marokecho. Bring the raw thought—a question, a plan, a half-formed note—and we will turn it into a clearer next move.",
}];

type PanelMode = "overview" | "history" | "saved" | "settings";

function timeLabel() {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

export default function Home() {
  const [language, setLanguage] = useState<"en" | "ar">(() => typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("ar") ? "ar" : "en");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [composer, setComposer] = useState("");
  const isStaticPreview = typeof window !== "undefined" && window.location.hostname.endsWith("github.io");
  const [activeMode, setActiveMode] = useState<PanelMode>("overview");
  const [panelOpen, setPanelOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const streamEndRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const chat = trpc.ai.chat.useMutation();
  const voice = trpc.voice.transcribe.useMutation();

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, chat.isPending]);

  useEffect(() => () => recorderRef.current?.stop(), []);

  const lastUserMessage = useMemo(() => [...messages].reverse().find((message) => message.role === "user"), [messages]);

  const focusComposer = (value = "") => {
    setComposer(value);
    window.setTimeout(() => composerRef.current?.focus(), 0);
  };

  const toggleVoiceCapture = async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setNotice("Voice capture is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > 8 * 1024 * 1024) {
          setNotice("Voice clips must be shorter than 8 MB.");
          return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = String(reader.result || "");
          const audioBase64 = dataUrl.split(",")[1] || "";
          try {
            const result = await voice.mutateAsync({
              audioBase64,
              mimeType: recorder.mimeType.startsWith("audio/ogg") ? "audio/ogg" : recorder.mimeType.startsWith("audio/mp4") ? "audio/mp4" : "audio/webm",
              language,
            });
            setComposer((current) => current ? `${current.trim()} ${result.text}` : result.text);
            window.setTimeout(() => composerRef.current?.focus(), 0);
          } catch (error) {
            console.error(error);
            setNotice("Voice transcription is temporarily unavailable. Please try again.");
          }
        };
        reader.readAsDataURL(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setNotice("Listening… press the microphone again when you are done.");
    } catch (error) {
      console.error(error);
      setNotice("Microphone access was denied or unavailable.");
    }
  };

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = composer.trim();
    if (!content || chat.isPending) return;
    if (isStaticPreview) {
      setNotice(language === "ar" ? "هذه نسخة عرض ثابتة. استخدم خادم Manus للمحادثة والصوت." : "This is a static preview. Use the Manus server for chat and voice.");
      return;
    }

    const userMessage: Message = { id: `user-${Date.now()}`, role: "user", time: timeLabel(), text: content };
    const history = messages
      .filter((message) => message.id !== "welcome")
      .slice(-10)
      .map((message) => ({ role: message.role, content: message.text }));

    setMessages((current) => [...current, userMessage]);
    setComposer("");

    try {
      const response = await chat.mutateAsync({ message: content, history });
      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: "assistant", time: timeLabel(), text: response.reply },
      ]);
    } catch (error) {
      console.error(error);
      setNotice(language === "ar" ? "تعذر الوصول إلى خادم الردود. حاول مرة أخرى من نسخة Manus." : "The reply is temporarily unavailable. Try again from the Manus deployment.");
    }
  };

  const newThread = () => {
    setMessages(initialMessages);
    setComposer("");
    setActiveMode("overview");
    setNotice("New thread started.");
    composerRef.current?.focus();
  };

  const copyMessage = async (message: Message) => {
    await navigator.clipboard?.writeText(message.text);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const navItems: Array<{ id: PanelMode; label: string; icon: typeof MessageCircle }> = [
    { id: "overview", label: "Chat", icon: MessageCircle },
    { id: "history", label: "Archive", icon: History },
    { id: "saved", label: "Saved", icon: FolderOpen },
  ];

  return (
    <main dir={language === "ar" ? "rtl" : "ltr"} className={language === "ar" ? "marokecho-shell rtl-ui" : "marokecho-shell"}>
      <aside className="brand-rail" aria-label="Main navigation">
        <div className="rail-brand">
          <div className="mark-frame"><img src={MARK_URL} alt="Marokecho compass mark" className="brand-mark" /></div>
          <span className="rail-wordmark">Marokecho</span>
        </div>
        <nav className="rail-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`rail-button ${activeMode === id ? "is-active" : ""}`} onClick={() => { setActiveMode(id); setPanelOpen(true); }} aria-label={label} title={label}>
              <Icon size={19} strokeWidth={1.8} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="rail-bottom">
          <button className="rail-button" onClick={() => { setActiveMode("settings"); setPanelOpen(true); }} aria-label="Settings" title="Settings"><Settings2 size={19} strokeWidth={1.8} /><span>Settings</span></button>
          <div className="rail-avatar" aria-label="Marokecho account">M</div>
        </div>
      </aside>

      <section className="conversation-column">
        <header className="topbar">
          <div className="mobile-brand"><img src={MARK_URL} alt="" className="brand-mark" /><span>Marokecho</span></div>
          <div className="topbar-meta"><span className="live-pulse"><i /> AI engine ready</span><span className="topbar-separator" /><span className="session-label">EXPLORATION / 01</span></div>
          <div className="topbar-actions"><button className="icon-button mobile-only" onClick={() => setPanelOpen((open) => !open)} aria-label="Open context panel">{panelOpen ? <X size={18} /> : <Menu size={18} />}</button><button type="button" className="language-switch" onClick={() => setLanguage((current) => current === "en" ? "ar" : "en")} aria-label={language === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}><Globe2 size={16} /> {language === "en" ? "EN" : "ع"}</button><button className="icon-button" onClick={() => setNotice("No new notifications.")} aria-label="Help"><CircleHelp size={18} /></button></div>
        </header>

        <div className="conversation-scroll">
          <section className="conversation-intro" style={{ backgroundImage: `url(${HERO_URL})` }}>
            <div className="intro-kicker"><span className="kicker-rule" /> Starting point · 01 <span className="kicker-rule" /></div>
            <h1>Turn curiosity<br />into a <em>clear route.</em></h1>
            <p>A calm working space to frame the thought, sort the context, and move with intent.</p>
          </section>

          <div className="message-stream" aria-live="polite">
            {messages.map((message) => (
              <article key={message.id} className={`message-row ${message.role === "user" ? "from-user" : "from-assistant"}`}>
                <div className="message-avatar">{message.role === "assistant" ? <img src={MARK_URL} alt="" className="message-mark" /> : "YOU"}</div>
                <div className="message-body"><div className="message-meta"><strong>{message.role === "assistant" ? "Marokecho" : "You"}</strong><span>{message.time}</span></div><div className={`message-bubble ${message.role === "assistant" ? "assistant-markdown" : ""}`}>{message.role === "assistant" ? <Streamdown>{message.text}</Streamdown> : message.text}</div>{message.role === "assistant" && <button className="copy-button" onClick={() => void copyMessage(message)}>{copiedId === message.id ? <Check size={13} /> : <Copy size={13} />}{copiedId === message.id ? "Copied" : "Copy reply"}</button>}</div>
              </article>
            ))}
            {chat.isPending && <article className="message-row from-assistant thinking-row"><div className="message-avatar"><img src={MARK_URL} alt="" className="message-mark" /></div><div className="message-body"><div className="message-meta"><strong>Marokecho</strong><span>Thinking</span></div><div className="thinking-bubble"><i /><i /><i /></div></div></article>}
            <div ref={streamEndRef} aria-hidden="true" />
          </div>

          {messages.length === 1 && <section className="suggestion-zone"><div className="section-label"><span /> Suggested signals <span /></div><div className="suggestion-list">{suggestions.map(({ icon: Icon, label, prompt }) => <button className="suggestion-card" key={label} onClick={() => focusComposer(prompt)}><span className="suggestion-icon"><Icon size={18} /></span><span>{label}</span><ChevronLeft size={16} className="suggestion-arrow" /></button>)}</div></section>}
        </div>

        <div className="composer-dock">
          <form className="composer-form" onSubmit={sendMessage}>
            <div className="composer-topline"><span><Radio size={14} /> Secure thinking space</span><span className="composer-count">{composer.length}/3000</span></div>
            <div className="composer-line"><Textarea ref={composerRef} value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder={isRecording ? "Listening for your signal…" : "Write the first signal…"} maxLength={3000} aria-label="Your message to Marokecho" /><button className={`voice-button ${isRecording ? "is-recording" : ""}`} type="button" onClick={() => void toggleVoiceCapture()} disabled={voice.isPending} aria-label={isRecording ? "Stop voice capture" : "Start voice capture"}>{voice.isPending ? <Loader2 size={17} className="spin-icon" /> : isRecording ? <Square size={14} fill="currentColor" /> : <Mic size={18} />}</button><Button className="send-button" type="submit" disabled={!composer.trim() || chat.isPending || isRecording} aria-label="Send message"><ArrowUp size={19} /></Button></div>
            <div className="composer-footer"><span>Enter to send</span><span>Shift + Enter for a new line</span><span className="composer-model"><span className={`status-dot ${isRecording ? "recording-dot" : ""}`} /> {voice.isPending ? "Transcribing voice" : chat.isPending ? "Marokecho is thinking" : isRecording ? "Listening" : "GPT-5 mini · secure server"}</span></div>
          </form>
          <div className="composer-shortcuts"><button type="button" onClick={newThread}><SquarePen size={15} /> New thread</button><button type="button" onClick={() => setNotice("File context will be available in the next workspace update.")}><Plus size={15} /> Add context</button></div>
        </div>
      </section>

      <aside className={`context-panel ${panelOpen ? "is-open" : ""}`} aria-label="Context panel">
        <div className="panel-header"><div><span className="eyebrow">Context panel</span><h2>{activeMode === "overview" ? "Session signal" : activeMode === "history" ? "Archive" : activeMode === "saved" ? "Saved work" : "Workspace settings"}</h2></div><button className="icon-button mobile-only" onClick={() => setPanelOpen(false)} aria-label="Close context panel"><X size={18} /></button></div>
        {activeMode === "overview" && <><div className="signal-card" style={{ backgroundImage: `linear-gradient(145deg, rgba(24,27,31,.08), rgba(24,27,31,.76)), url(${CARD_URL})` }}><div className="signal-card-top"><span>01 / 03</span><Compass size={18} /></div><div><strong>The route is clear</strong><p>Every reply starts with your context, not a generic template.</p></div><div className="signal-meter"><span /><span /><span /></div></div><div className="panel-section"><div className="section-heading"><span>Engine status</span><span className="ready-tag"><i /> Live</span></div><div className="engine-status"><div className="engine-icon"><Zap size={17} /></div><div><strong>Marokecho AI</strong><small>GPT-5 MINI · SERVER</small></div><MoreHorizontal size={18} className="muted-icon" /></div></div><div className="panel-section"><div className="section-heading"><span>Session pulse</span><Clock3 size={15} /></div><div className="session-stats"><div><strong>{messages.filter((message) => message.role === "user").length}</strong><span>Your messages</span></div><div><strong>{lastUserMessage ? "Live" : "—"}</strong><span>Last signal</span></div></div></div><div className="panel-note"><span className="note-pin" /><p>Write without polishing. Strong answers start with the real question.</p></div></>}
        {activeMode === "history" && <div className="empty-panel"><History size={30} /><strong>No archive yet</strong><p>Past working sessions will appear here when persistence is enabled.</p><button onClick={() => setActiveMode("overview")}>Return to session <ChevronLeft size={15} /></button></div>}
        {activeMode === "saved" && <div className="empty-panel"><FolderOpen size={30} /><strong>Saved work is quiet</strong><p>Pin important replies to build a reusable working library.</p><button onClick={() => setNotice("Saved replies will be available with workspace accounts.")}>Learn more <ExternalLink size={14} /></button></div>}
        {activeMode === "settings" && <div className="settings-panel"><div className="setting-row"><div><strong>Primary language</strong><small>English</small></div><Globe2 size={17} /></div><div className="setting-row"><div><strong>Mode</strong><small>Ink night</small></div><span className="mode-chip">Live</span></div><div className="setting-row"><div><strong>Shortcuts</strong><small>Enabled</small></div><Command size={17} /></div></div>}
        <div className="panel-footer"><div className="footer-link"><Globe2 size={15} /><span>Built for clear global thinking</span></div><div className="footer-links"><button onClick={() => setNotice("Privacy controls are coming with accounts.")}>Privacy</button><button onClick={() => setNotice("Help center is coming soon.")}>Help</button></div></div>
      </aside>
      {notice && <div className="notice-toast" role="status"><Check size={15} /> {notice}</div>}
    </main>
  );
}
