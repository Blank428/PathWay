import { useEffect, useState } from 'react';

const KEY = 'pathway-ufe-questions';

export default function Questions({ items }: { items: string[] }) {
  const [on, setOn] = useState<boolean[]>(items.map(() => false));
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState<'' | 'ok' | 'select'>('');
  const [canPrint, setCanPrint] = useState(false);

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) { setOn(items.map((q) => s.q?.includes(q))); setNote(s.note || ''); } } catch {}
    try { setCanPrint(window.self === window.top); } catch { setCanPrint(false); }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ q: items.filter((_, i) => on[i]), note })); } catch {}
  }, [on, note]);

  const text = () => {
    const picked = items.filter((_, i) => on[i]);
    return ['Questions for my UFE appointment', ...picked.map((q) => '- ' + q), ...(note.trim() ? ['- ' + note.trim()] : [])].join('\n');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(text()); setCopied('ok'); }
    catch { setCopied('select'); }
  };

  return (
    <div className="questions">
      <ul>
        {items.map((q, i) => (
          <li key={q}>
            <label>
              <input type="checkbox" id={`q-${i}`} checked={on[i]} onChange={(e) => setOn((a) => a.map((v, k) => (k === i ? e.target.checked : v)))} />
              <span>{q}</span>
            </label>
          </li>
        ))}
      </ul>
      <label className="own-q" htmlFor="own-question">Your own question</label>
      <textarea id="own-question" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything else you want to ask" />
      <div className="questions-actions">
        <button type="button" className="btn btn-primary" onClick={copy} disabled={!on.some(Boolean) && !note.trim()}>Copy my questions</button>
        {canPrint && <button type="button" className="btn btn-quiet" onClick={() => window.print()}>Print this page</button>}
        <span className="mono copied" role="status">{copied === 'ok' ? 'Copied. Paste them into a note or a message.' : ''}</span>
      </div>
      {copied === 'select' && <textarea className="copy-fallback" readOnly rows={6} value={text()} onFocus={(e) => e.currentTarget.select()} aria-label="Your questions, ready to copy" />}
      <p className="mono small-note">Ticks are saved on this device only.</p>
    </div>
  );
}
