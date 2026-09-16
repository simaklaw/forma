import { useEffect, useRef, useState } from "react";
import { CoachEngine } from "@forma/core";
import { Button } from "@/components/ui/button";
import { getWebTrainerProgress } from "@/lib/ai/boot";
import { webUserContextSnapshot } from "@/lib/snapshot";
import { COACH_WELCOME, useAppStore } from "@/lib/store";

const CHIPS = ["Сколько белка?", "Калории сегодня", "Совет на тренировку", "Восстановление"];

export function CoachScreen() {
  const messages = useAppStore((s) => s.coachMessages);
  const setCoachMessages = useAppStore((s) => s.setCoachMessages);
  const clearCoachMessages = useAppStore((s) => s.clearCoachMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [llmReady, setLlmReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLlmReady(CoachEngine.isLlmReady());
      setProgress(getWebTrainerProgress());
    }, 400);
    return () => window.clearInterval(id);
  }, []);

  async function send(raw?: string) {
    const q = (raw ?? input).trim();
    if (!q || busy) return;
    setInput("");
    const base = useAppStore.getState().coachMessages;
    setCoachMessages([...base, { role: "user", text: q }, { role: "coach", text: "" }]);
    setBusy(true);
    try {
      let acc = "";
      await CoachEngine.getTrainer().streamAdvice(webUserContextSnapshot(), q, (token) => {
        acc += token;
        const cur = useAppStore.getState().coachMessages;
        const next = [...cur];
        next[next.length - 1] = { role: "coach", text: acc };
        setCoachMessages(next);
      });
    } finally {
      setBusy(false);
    }
  }

  const status = llmReady
    ? "WebLLM · on-device"
    : progress > 0 && progress < 1
      ? `Загрузка модели · ${Math.round(progress * 100)}%`
      : "Rules · offline";

  const visible = messages.filter((m) => m.text.length > 0);
  const canClear = messages.some((m) => m.text !== COACH_WELCOME && m.text.length > 0);

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col px-5 pb-4 pt-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Тренер</h1>
          <p className="mt-1 text-sm text-muted">{status}</p>
        </div>
        {canClear && (
          <button
            type="button"
            onClick={clearCoachMessages}
            className="text-xs text-muted underline"
          >
            Очистить
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            disabled={busy}
            onClick={() => void send(c)}
            className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted disabled:opacity-50"
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
        {(visible.length ? visible : [{ role: "coach" as const, text: COACH_WELCOME }]).map((m, i) =>
          m.text ? (
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
          ) : null,
        )}
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
