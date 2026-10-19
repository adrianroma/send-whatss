"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "bot"; text: string };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [vars, setVars] = useState<Record<string, string | null>>({});
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages, busy, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const history = messages;
    setMessages([...history, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, cursor, history, vars }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCursor(data.cursor);
      setVars(data.vars ?? {});
      setMessages((m) => [
        ...m,
        ...data.replies.map((r: { text: string }): Msg => ({ role: "bot", text: r.text })),
      ]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Ocurrió un error. Intenta de nuevo." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[28rem] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="bg-zinc-900 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">
            Chat
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {!messages.length && <p className="text-zinc-500">Escribe un mensaje para comenzar.</p>}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <span
                  className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 ${
                    m.role === "user"
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "bg-zinc-100 dark:bg-zinc-800"
                  }`}
                >
                  {m.text}
                </span>
              </div>
            ))}
            {busy && <p className="text-xs text-zinc-500">Escribiendo…</p>}
            <div ref={bottom} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-zinc-200 p-2 dark:border-zinc-800">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              placeholder="Escribe tu mensaje…"
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none dark:border-zinc-700"
            />
            <button
              disabled={busy || !input.trim()}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
            >
              Enviar
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Cerrar chat" : "Abrir chat"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-2xl text-white shadow-lg dark:bg-white dark:text-zinc-900"
      >
        {open ? "×" : "💬"}
      </button>
    </div>
  );
}
