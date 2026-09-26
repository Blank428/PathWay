import { useState } from 'react';

type Q = { q: string; opts: string[]; a: number; why: string };

export default function Quiz({ items }: { items: Q[] }) {
  const [picked, setPicked] = useState<(number | null)[]>(items.map(() => null));
  const score = picked.filter((p, i) => p === items[i].a).length;
  const done = picked.every((p) => p !== null);
  return (
    <div className="quiz">
      {items.map((it, i) => {
        const p = picked[i];
        return (
          <fieldset key={i} className="quiz-q">
            <legend>{it.q}</legend>
            <div className="quiz-opts">
              {it.opts.map((o, j) => {
                const state = p === null ? '' : j === it.a ? 'is-right' : j === p ? 'is-wrong' : 'is-dim';
                return (
                  <button key={j} type="button" className={'quiz-opt ' + state} aria-pressed={p === j} disabled={p !== null}
                    onClick={() => setPicked((arr) => arr.map((v, k) => (k === i ? j : v)))}>
                    {o}
                  </button>
                );
              })}
            </div>
            {p !== null && (
              <p className={'quiz-why ' + (p === it.a ? 'is-right' : 'is-wrong')} role="status">
                <strong>{p === it.a ? 'Right.' : 'Not quite.'}</strong> {it.why}
              </p>
            )}
          </fieldset>
        );
      })}
      <p className="quiz-foot mono" aria-live="polite">
        {done ? `${score} of ${items.length} right. ` : ''}Your answers stay on this page and are not sent anywhere.
        {done && <button type="button" className="linkish" onClick={() => setPicked(items.map(() => null))}>Try again</button>}
      </p>
    </div>
  );
}
