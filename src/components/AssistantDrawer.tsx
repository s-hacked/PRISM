import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import MaterialIcon from './MaterialIcon';
import { api } from '../services/api';
import type { AssistantResponse } from '../types';

const SUGGESTIONS = [
  'Which customers are most at risk?',
  'Why did churn increase?',
  'How much revenue is at risk?',
  "What is next month's forecast?",
  'How healthy is the model?',
];

// AI Assistant — sends questions to POST /api/assistant and renders
// answers computed from the active dataset.
export default function AssistantDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<{ q: string; a: AssistantResponse }[]>([]);
  const mutation = useMutation({
    mutationFn: (q: string) => api.askAssistant(q),
    onSuccess: (data) => setMessages((m) => [...m, { q: question, a: data }]),
  });

  const ask = (q: string) => {
    const text = q.trim();
    if (!text || mutation.isPending) return;
    setQuestion(text);
    mutation.mutate(text);
    setQuestion('');
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-on-surface/30 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface-container-lowest shadow-modal animate-slide-in-right flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <MaterialIcon name="auto_awesome" size={20} className="text-primary" />
            <div>
              <p className="text-sm font-semibold text-on-surface">PRISM Copilot</p>
              <p className="text-[11px] text-on-surface-variant">Answers from the active dataset</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors">
            <MaterialIcon name="close" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center mx-auto mb-3">
                <MaterialIcon name="psychology" size={24} />
              </div>
              <p className="text-sm font-semibold text-on-surface">Ask about your data</p>
              <p className="text-xs text-on-surface-variant mt-1">Answers are computed live from the active dataset.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className="space-y-2 animate-slide-up">
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-primary-container text-on-primary rounded-xl rounded-br-sm px-3 py-2 text-xs font-medium">
                  {m.q}
                </div>
              </div>
              <div className="max-w-[92%] bg-surface-container-low rounded-xl rounded-bl-sm px-3 py-2.5">
                <p className="text-[11px] font-semibold text-primary mb-1">{m.a.headline}</p>
                <p className="text-xs text-on-surface whitespace-pre-line leading-relaxed">{m.a.answer}</p>
                {m.a.chips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {m.a.chips.map((c, j) => (
                      <span key={j} className="chip-info">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {mutation.isPending && (
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <MaterialIcon name="autorenew" size={14} className="animate-spin" />
              Analyzing dataset…
            </div>
          )}
          {mutation.isError && (
            <p className="text-xs text-error">Unable to process that question. Please try again.</p>
          )}
        </div>

        <div className="px-5 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">Suggested</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="px-2.5 py-1 rounded bg-surface-container-low hover:bg-surface-container text-on-surface text-[11px] text-left transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <form
          className="p-4 border-t border-outline-variant/20 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="flex-1 h-9 px-3 bg-surface-container-low text-on-surface rounded border border-outline-variant/30 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Ask questions about schema or predictions…"
            type="text"
          />
          <button
            type="submit"
            disabled={mutation.isPending || !question.trim()}
            className="p-2 rounded bg-primary-container text-on-primary hover:bg-primary disabled:opacity-40 transition-colors"
            aria-label="Send"
          >
            <MaterialIcon name="send" size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
