// Game-over "here's what you missed" line. Ending a run on an unanswered
// question is confusing, so each game reveals its own version of the answer.
// Styled inline — like the rank badge — so a game can drop it into its modal
// without every game's stylesheet needing the same rule.

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** A muted label above the answer, e.g. answerHtml('The word was', 'PIANO'). */
export function answerHtml(label: string, value: string): string {
  return (
    `<p class="sub" style="margin:12px 0 0">${esc(label)}</p>` +
    `<div class="reveal-answer" style="font-size:1.3rem;font-weight:800;color:var(--accent);line-height:1.3">${esc(value)}</div>`
  );
}
