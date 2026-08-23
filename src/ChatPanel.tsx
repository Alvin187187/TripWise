/**
 * ChatPanel — Pawi chatbot UI.
 * Online: calls /api/chat. Offline: rule-based templates.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { mascotFront, mascotHappy, mascotWorried } from "./assets/media";
import { buildChatContext, type ChatContext } from "./chatConfig";
import { offlineRespond } from "./chatOffline";
import { logChatExchange } from "./chatLog";
import type { Lang } from "./i18n";
import type { LiveBundle } from "./live";
import Icon from "./icons";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  profile: { name: string; motorClass: string; tripDuration: number; fishingGround: string; gear: string } | null;
  live: LiveBundle | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const API_URL = "/api/chat";

// ─── Pawi expression images ───────────────────────────────────────────────────
// idle/listening = mascotFront (neutral mild smile)
// thinking       = mascotWorried (concerned, processing)
// happy/replied  = mascotHappy (open-mouth smile, responded)
const PAWI_IDLE = mascotFront;
const PAWI_THINKING = mascotWorried;
const PAWI_HAPPY = mascotHappy;

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatPanel({ open, onClose, lang, profile, live }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [justReplied, setJustReplied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const buildCtx = useCallback((): ChatContext => {
    return buildChatContext(profile, live as Parameters<typeof buildChatContext>[1], lang);
  }, [profile, live, lang]);

  // Determine which Pawi face to show in the header
  const headerFace = loading ? PAWI_THINKING : justReplied ? PAWI_HAPPY : PAWI_IDLE;

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: uid(), role: "user", text, timestamp: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    const ctx = buildCtx();
    const mode = online ? "online" : "offline";

    try {
      let answer: string;
      let actualMode = mode;

      if (online) {
        try {
          const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: text, context: ctx }),
          });
          const data = await res.json().catch(() => ({} as { answer?: string; error?: string }));
          if (!res.ok) throw new Error(data.error || `API ${res.status}`);
          answer = data.answer || "Sorry, I couldn't generate a response.";
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          const network = err instanceof TypeError;
          if (network) {
            actualMode = "offline";
            const result = offlineRespond(text, ctx, lang);
            answer = result.answer;
          } else {
            answer = lang === "fil"
              ? `Hindi ako makasagot sa Gemini ngayon. ${msg}`
              : `I couldn't reach Gemini just now. ${msg}`;
          }
        }
      } else {
        // ─── Offline: templated response ─────────────────────────────────────
        const result = offlineRespond(text, ctx, lang);
        answer = result.answer;
      }

      const botMsg: ChatMessage = { id: uid(), role: "assistant", text: answer, timestamp: Date.now() };
      setMessages((m) => [...m, botMsg]);

      // Trigger reply bounce animation + happy face
      setJustReplied(true);
      setTimeout(() => setJustReplied(false), 1500);

      // Log to Supabase (fire-and-forget)
      logChatExchange({
        question: text,
        answer,
        mode: actualMode,
        language: lang,
        timestamp: new Date().toISOString(),
        boat_id: profile?.name ?? "anonymous",
      });
    } catch (err) {
      // Last-resort fallback (shouldn't normally hit this)
      const fallback = lang === "fil"
        ? "May problema. Subukan mo ulit mamaya."
        : "Something went wrong. Please try again.";
      setMessages((m) => [...m, { id: uid(), role: "assistant", text: fallback, timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, online, lang, buildCtx, profile]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) return null;

  const modeLabel = online
    ? (lang === "fil" ? "Nasa Internet" : "Online")
    : (lang === "fil" ? "Offline (cached)" : "Offline (cached)");

  return (
    <div className="chat-overlay" onClick={onClose}>
      <div className="chat-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chat-header">
          <img src={headerFace} alt="Pawi" className={`chat-header__avatar chat-avatar--idle ${justReplied ? "chat-avatar--bounce" : ""}`} />
          <div className="chat-header__info">
            <span className="chat-header__name">Pawi</span>
            <span className={`chat-header__mode ${online ? "chat-header__mode--online" : "chat-header__mode--offline"}`}>
              <span className="chat-header__dot" />
              {modeLabel}
            </span>
          </div>
          <button className="chat-header__close" onClick={onClose} aria-label="Close chat">
            <Icon name="close" size={20} color="#40627E" />
          </button>
        </div>

        {/* Messages */}
        <div className="chat-messages" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="chat-empty">
              <img src={PAWI_HAPPY} alt="Pawi greeting" className="chat-empty__mascot chat-avatar--idle" />
              <p className="chat-empty__text">
                {lang === "fil"
                  ? "Kumusta! Ako si Pawi. Tanungin mo ako tungkol sa weather, score, diesel, o kung sulit ba pumalaot ngayon."
                  : "Hey! I'm Pawi. Ask me about the weather, today's score, diesel price, or whether a trip is worth it."}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble chat-bubble--${msg.role}`}>
              {msg.role === "assistant" && (
                <img src={PAWI_IDLE} alt="" className="chat-bubble__avatar chat-avatar--idle" />
              )}
              <div className={`chat-bubble__text chat-bubble__text--${msg.role}`}>
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-bubble chat-bubble--assistant">
              <img src={PAWI_THINKING} alt="" className="chat-bubble__avatar chat-avatar--thinking" />
              <div className="chat-bubble__text chat-bubble__text--assistant chat-bubble__thinking">
                <span className="dot-pulse"><span /><span /><span /></span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="chat-input-bar">
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder={lang === "fil" ? "Magtanong kay Pawi…" : "Ask Pawi…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            className="chat-send"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            aria-label="Send"
          >
            <Icon name="play" size={18} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FAB (floating action button) ────────────────────────────────────────────
export function ChatFAB({ onClick }: { onClick: () => void }) {
  return (
    <button className="chat-fab" onClick={onClick} aria-label="Open chat with Pawi">
      <img src={mascotFront} alt="Pawi" className="chat-fab__img chat-avatar--idle" />
    </button>
  );
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
