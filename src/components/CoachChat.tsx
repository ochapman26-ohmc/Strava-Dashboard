"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id?: number;
  role: string;
  content: string;
}

const SUGGESTIONS = [
  "How am I progressing toward my goals?",
  "What should I focus on this week?",
  "Analyze my recent running pace trends",
  "Am I overtraining based on my recent activities?",
  "Suggest a recovery plan after my last hard session",
];

export function CoachChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/coach")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMessages(data);
        setInitialized(true);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(content: string, weeklyReview = false) {
    if (!content.trim() && !weeklyReview) return;
    setLoading(true);

    if (!weeklyReview) {
      setMessages((prev) => [...prev, { role: "user", content }]);
      setInput("");
    }

    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: content, weeklyReview }),
    });

    const data = await res.json();
    if (data.content) {
      if (weeklyReview) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: "📊 Weekly training review" },
          { role: "assistant", content: data.content },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
      }
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {!initialized ? (
          <div className="text-center text-muted py-12">Loading chat...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🏃</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">Your AI Training Coach</h2>
            <p className="text-muted max-w-md mx-auto mb-6">
              Ask me anything about your training, goals, or performance. I have access to your Garmin activity data and goals.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-sm px-3 py-1.5 rounded-full border border-card-border text-muted hover:text-foreground hover:border-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-accent text-white"
                    : "card"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="card px-4 py-3 text-sm text-muted">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">·</span>
                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>·</span>
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-card-border p-4 space-y-3">
        <button
          onClick={() => sendMessage("", true)}
          disabled={loading}
          className="btn-secondary w-full text-sm"
        >
          📊 Get Weekly Training Review
        </button>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your coach anything..."
            disabled={loading}
            className="flex-1 bg-card border border-card-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
          <button type="submit" disabled={loading || !input.trim()} className="btn-primary">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
