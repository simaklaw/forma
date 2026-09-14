import { useEffect, useRef, useState } from "react";
import { CoachEngine } from "@forma/core";
import { Button } from "@/components/ui/button";
import { webUserContextSnapshot } from "@/lib/snapshot";

type Msg = { role: "user" | "coach"; text: string };

export function CoachScreen() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "coach",
      text: "Я локальный тренер. Данные не уходят в облако. Спроси про белок, калории или тренировку.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const text = await CoachEngine.getTrainer().generateAdvice(webUserContextSnapshot(), q);
      setMessages((m) => [...m, { role: "coach", text }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col px-5 pb-4 pt-10">
      <h1 className="font-display text-2xl tracking-tight">Тренер</h1>
      <p className="mt-1 text-sm text-muted">On-device · без облака</p>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-8 rounded-2xl bg-accent px-3 py-2 text-sm text-accent-fg"
                : "mr-8 rounded-2xl bg-surface px-3 py-2 text-sm shadow-card"
            }
          >
            {m.text}
          </div>
        ))}
        {busy && <p className="text-xs text-muted">Думаю…</p>}
        <div ref={bottom} />
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          className="h-11 flex-1 rounded-lg bg-surface-2 px-3 text-sm outline-none"
          placeholder="Спроси про день, белок, нагрузку…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit" disabled={busy || !input.trim()}>
          Ок
        </Button>
      </form>
    </div>
  );
}
