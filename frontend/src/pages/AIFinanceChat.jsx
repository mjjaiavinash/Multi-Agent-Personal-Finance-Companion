import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, BrainCircuit, User, Trash2, Sparkles,
  ShoppingCart, TrendingUp, PiggyBank, Calculator, ArrowDown,
} from "lucide-react";
import { sendChatMessage } from "../api/ai";

const MAX_CHARS = 2000;

const INITIAL_MESSAGE = {
  role:      "assistant",
  content:   "Hi! I'm **SpendSense AI**, your personal finance assistant.\n\nI have full access to your spending data and can give you **specific, data-driven answers** — not generic advice.\n\nAsk me anything about your finances, or pick a suggestion below to get started.",
  timestamp: new Date(),
};

const SUGGESTIONS = [
  { icon: ShoppingCart, label: "Can I afford a ₹50,000 laptop this month?",        color: "text-cyan-400",    bg: "hover:bg-cyan-500/5   border-cyan-500/20   hover:border-cyan-500/40"   },
  { icon: TrendingUp,   label: "Why did I spend more this month than last month?",  color: "text-rose-400",    bg: "hover:bg-rose-500/5   border-rose-500/20   hover:border-rose-500/40"   },
  { icon: Calculator,   label: "Help me plan a realistic monthly budget.",           color: "text-amber-400",   bg: "hover:bg-amber-500/5  border-amber-500/20  hover:border-amber-500/40"  },
  { icon: PiggyBank,    label: "Which expenses should I cut first to save money?",  color: "text-emerald-400", bg: "hover:bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40" },
];

const toGroqHistory = (messages) => {
  const firstUserIdx = messages.findIndex((m) => m.role === "user");
  if (firstUserIdx === -1) return [];
  return messages.slice(firstUserIdx, -1).map((msg) => ({
    role:    msg.role === "user" ? "user" : "assistant",
    content: msg.content,
  }));
};

const formatTime = (date) =>
  date instanceof Date
    ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "";

// ─── Markdown renderer ────────────────────────────────────────────────────────

const FormattedMessage = ({ content }) => {
  const lines = content.split("\n");

  const renderInline = (text, key) => {
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return (
      <span key={key}>
        {parts.map((part, i) =>
          i % 2 === 1
            ? <strong key={i} className="font-semibold text-white">{part}</strong>
            : <span key={i}>{part}</span>
        )}
      </span>
    );
  };

  const elements = [];
  let bulletBuffer = [];

  const flushBullets = () => {
    if (!bulletBuffer.length) return;
    elements.push(
      <ul key={`ul-${elements.length}`} className="my-2 flex flex-col gap-1.5 pl-1">
        {bulletBuffer.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary-400/70 flex-shrink-0" />
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
      bulletBuffer.push(trimmed.slice(2));
    } else {
      flushBullets();
      if (trimmed === "") {
        if (elements.length > 0) elements.push(<div key={`br-${i}`} className="h-2" />);
      } else {
        elements.push(<p key={i} className="leading-7">{renderInline(trimmed, i)}</p>);
      }
    }
  });
  flushBullets();

  return <div className="flex flex-col gap-0.5 text-[15px]">{elements}</div>;
};

// ─── Message row ──────────────────────────────────────────────────────────────

function MessageRow({ msg }) {
  const isUser = msg.role === "user";

  return (
    <div className={`w-full py-6 ${isUser ? "bg-transparent" : "bg-surface-800/40"}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 flex gap-4 items-start">
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isUser ? "bg-primary-600" : "bg-surface-700 border border-surface-600"
        }`}>
          {isUser
            ? <User size={14} className="text-white" />
            : <BrainCircuit size={14} className="text-primary-400" />
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-slate-400">
              {isUser ? "You" : "SpendSense AI"}
            </span>
            {msg.timestamp && (
              <span className="text-[11px] text-slate-600">{formatTime(msg.timestamp)}</span>
            )}
          </div>
          {isUser
            ? <p className="text-[15px] text-slate-100 leading-7 whitespace-pre-wrap">{msg.content}</p>
            : <div className="text-slate-200"><FormattedMessage content={msg.content} /></div>
          }
        </div>
      </div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingRow() {
  return (
    <div className="w-full py-6 bg-surface-800/40">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 flex gap-4 items-start">
        <div className="w-8 h-8 rounded-full bg-surface-700 border border-surface-600 flex items-center justify-center flex-shrink-0">
          <BrainCircuit size={14} className="text-primary-400" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-slate-400 mb-2">SpendSense AI</div>
          <div className="flex gap-1.5 items-center h-6">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Welcome screen ───────────────────────────────────────────────────────────

function WelcomeScreen({ onSelect, disabled }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-16 h-16 rounded-2xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center mb-5">
        <BrainCircuit size={32} className="text-primary-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-100 mb-2">SpendSense AI</h2>
      <p className="text-slate-400 text-sm text-center max-w-sm mb-10">
        Your personal finance assistant. Ask me anything about your spending, savings, or budget.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {SUGGESTIONS.map(({ icon: Icon, label, color, bg }) => (
          <button
            key={label}
            onClick={() => onSelect(label)}
            disabled={disabled}
            className={`flex items-start gap-3 px-4 py-3.5 rounded-xl bg-surface-800 border text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${bg}`}
          >
            <Icon size={16} className={`${color} flex-shrink-0 mt-0.5`} />
            <span className="text-sm text-slate-300 leading-snug">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AIFinanceChat() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [atBottom, setAtBottom] = useState(true);

  const bottomRef    = useRef(null);
  const scrollRef    = useRef(null);
  const inputRef     = useRef(null);

  const turnCount  = messages.filter((m) => m.role === "user").length;
  const isFirstTurn = turnCount === 0;
  const charsLeft  = MAX_CHARS - input.length;
  const isOverLimit = charsLeft < 0;

  // Auto-scroll
  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, atBottom]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setAtBottom(true);
  };

  const handleInputChange = (e) => {
    const el = e.target;
    setInput(el.value);
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const sendMessage = useCallback(async (text) => {
    const userMsg = (text ?? input).trim();
    if (!userMsg || loading) return;

    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setError(null);
    setAtBottom(true);

    const userEntry = { role: "user", content: userMsg, timestamp: new Date() };
    const updatedMessages = [...messages, userEntry];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const history = toGroqHistory(updatedMessages);
      const { data } = await sendChatMessage(userMsg, history);
      const reply = data?.data?.reply ?? data?.reply ?? "I couldn't generate a response. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply, timestamp: new Date() }]);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to get a response. Please try again.");
      setMessages(messages);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setError(null);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 5rem)" }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-surface-700/60 bg-surface-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
            <BrainCircuit size={16} className="text-primary-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">SpendSense AI</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-400">Online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {turnCount > 0 && (
            <span className="text-xs text-slate-500 mr-1">{turnCount} {turnCount === 1 ? "message" : "messages"}</span>
          )}
          {turnCount > 0 && (
            <button
              onClick={clearChat}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-surface-700 border border-surface-700 hover:border-surface-600 transition-all disabled:opacity-40"
            >
              <Trash2 size={13} /> New chat
            </button>
          )}
        </div>
      </div>

      {/* ── Messages area ───────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative"
      >
        {isFirstTurn ? (
          <WelcomeScreen onSelect={sendMessage} disabled={loading} />
        ) : (
          <div className="pb-4">
            {/* Skip initial greeting in the message list, show from first user msg */}
            {messages.slice(1).map((msg, i) => (
              <MessageRow key={i} msg={msg} />
            ))}
            {loading && <TypingRow />}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Scroll to bottom button */}
        {!atBottom && !isFirstTurn && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-32 right-6 w-9 h-9 rounded-full bg-surface-700 border border-surface-600 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-surface-600 shadow-lg transition-all z-10"
          >
            <ArrowDown size={15} />
          </button>
        )}
      </div>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400/60 hover:text-rose-400 ml-3 text-lg leading-none">×</button>
          </div>
        </div>
      )}

      {/* ── Input bar ───────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-surface-700/60 bg-surface-900/80 backdrop-blur-sm px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-surface-800 border border-surface-600 rounded-2xl px-4 py-3 focus-within:border-primary-500/60 focus-within:ring-1 focus-within:ring-primary-500/30 transition-all">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Message SpendSense AI…"
              maxLength={MAX_CHARS}
              className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-[15px] resize-none focus:outline-none leading-relaxed"
              style={{ minHeight: "26px", maxHeight: "160px" }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isOverLimit || loading}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 text-white"
              aria-label="Send"
            >
              <Send size={14} />
            </button>
          </div>

          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-[11px] text-slate-600 flex items-center gap-1">
              <Sparkles size={10} />
              Powered by Groq · llama-3.3-70b
            </p>
            <div className="flex items-center gap-3">
              {input.length > MAX_CHARS * 0.8 && (
                <span className={`text-[11px] ${isOverLimit ? "text-rose-400" : "text-slate-500"}`}>
                  {charsLeft} left
                </span>
              )}
              <span className="text-[11px] text-slate-600">Enter to send · Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
