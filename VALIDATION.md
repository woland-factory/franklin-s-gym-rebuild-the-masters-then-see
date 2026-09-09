# VALIDATION — Franklin's Gym

**Verdict: VIABLE**, conditional on three design constraints that the product
plan must treat as binding spec, not advice. Each is listed under "Binding
conditions" below; a plan that drops any of them should be treated as
planning against a different, rejected idea.

---

## Core value proposition

Deliberate practice for writing, using Benjamin Franklin's own documented
exercise: condense a great public-domain passage into sentence-level hints,
lose access to the original for a few days, rebuild the passage from the
hints alone, then see your version aligned sentence-by-sentence against the
master's with every omission and flattening visible. The tool does the three
things paper and chatbots structurally cannot: it **enforces the blind
interval** (the original is vaulted until the delay passes), it **computes
the alignment** deterministically in seconds (the manual collation step is
where DIY attempts die), and it **keeps the ledger** — a dated, exportable
record of every attempt that accumulates into something the user would mourn
losing.

## Does it survive the substitution tests?

- **A chatbot?** No. A chat window is the opposite of a vault: the original
  sits in scrollback and nothing prevents the peek that voids the exercise.
  A model's critique is also variable and flattering; a diff against the
  fixed original cannot be sweet-talked. And a months-long dated ledger is
  a database, not a conversation. The judgment step ("which differences
  matter?") is chatbot-substitutable, which is exactly why the product must
  frame the alignment as a reading instrument and never compete on
  judgment (see condition 1).
- **An existing free tool?** No. TypeLit/Copywork are verbatim transcription
  (fingers, not sentence-forming). Hemingway lints your own drafts with no
  masters, no loop, no memory. No open-source implementation of the loop was
  found. FranklinWrite (paid, 2020) is the one precedent and does not
  verifiably ship the enforced delay, the sentence-aligned diff, or the
  ledger — the triple that IS this product.
- **Paper?** A disciplined person can DIY it; Franklin did. The tool earns
  its place at exactly the two steps where DIY dies: enforcing the interval
  and doing the collation.

## Does it leave something durable?

Yes, twice. The ledger — a growing corpus of "my sentence vs. the master's"
pairs with dated attempts and reconstruction metrics, exportable as plain
files — and the skill itself, which is why the exercise has 250 years of
testimonial. This is a compounding artifact, not a one-shot converter.

## Can agents deliver it at the quality bar?

Yes, with no flagged blockers. The core is classic deterministic computation:
sentence segmentation plus best-match alignment (token overlap + edit
distance — the same family as a code diff). No runtime LLM anywhere in the
core loop, so no BYOK surface, no gateway grant, no per-use cost. Corpus
seeds from Project Gutenberg (The Spectator — Franklin's own training
material — plus curated pre-1930 classics). The delay mechanic needs only a
clock and stored state. The first-minute staging requirement is satisfiable
via seeded demo state: a sample attempt already "ripe" so a stranger sees
the alignment view — the differentiator — immediately, plus a day-one
micro-drill (short passage, minutes-long delay filled by a distractor
passage) so a real first session still ends in a real alignment.

## Binding conditions (the plan must carry these)

1. **The metric trap is fenced off.** Deterministic metrics measure
   *reconstruction fidelity* (ideas recovered, structure match), never
   *prose quality*. A parrot scores perfectly; Franklin's own endgame —
   improving the original — is deliberate divergence a similarity score
   would punish. The ledger charts recovered-substance over time; the
   alignment view is a reading instrument the user judges with their own
   eyes. Any single "similarity to the master" quality score, streak, or
   leaderboard is a defect: it would measurably train memorization, the
   thing the product exists to be better than.
2. **The delay cliff is a first-class design problem.** First full value is
   days away by design (the forgetting interval is the active ingredient).
   The plan must include: a first-session micro-drill with a short
   distractor-filled delay so day one ends in a small, real alignment; a
   pipeline habit (several passages condensed in week one) so something is
   always ripe from day four on; and seeded demo state so staging shows the
   alignment view within a minute.
3. **The diff's honesty is presented, not oversold.** The alignment marks
   *differences* — omissions, additions, length and structure gaps — and
   must never claim to mark *worseness*. Framing copy and visual language
   must present "here is what differs" and let the confrontation do the
   teaching. Overclaiming here is what would make the premortem's "it's
   just a memory test" objection true.

## Main risks (accepted, eyes open)

- **Demand warning.** FranklinWrite shipped adjacent drills in 2020, paid,
  and found near-zero traction in six years. Going free and shipping the
  enforced-delay/diff/ledger triple removes real failure causes, but the
  graveyard is evidence the audience is narrow. The factory has no revenue
  goal; the bet is durable value for the person repeatedly told to "read
  more" — a wish voiced unprompted in the evidence threads. Narrow is
  acceptable; empty would not be, and we cannot fully rule empty out.
- **Retention leans on the user.** The loop requires returning, and a
  local-first tool has no external pull beyond calendar export. The
  premortem's best first-person account is an enthusiast who quit after one
  repetition. The pipeline habit and micro-drill mitigate; they do not
  eliminate. Most users will not build a months-long ledger. The product is
  still worth existing for the ones who do — this is the outlier bet the
  funnel exists to make.
- **Archaic corpus.** US public domain ends at 1930: Addison, Austen, Twain,
  not Orwell or Didion. Mitigation: curate toward still-modern-sounding
  classics; let users paste modern passages for private, local, never
  redistributed practice.

## What would make me reject it (kill triggers for later gates)

- The plan gamifies similarity-to-original as a quality score or progress
  number (violates condition 1 — the product would train parroting).
- The plan cannot make day one end in a real alignment (violates
  condition 2 — the first session ends in homework and nobody returns).
- Scope balloons into Franklin's full seven-drill curriculum, accounts,
  social features, or spoken reconstruction in v1. The MVP is one loop done
  excellently: condense → vault → reconstruct → align → ledger.
- Any move to bolt on a runtime LLM "judge" in the core loop. That
  surrenders the substitution defense and re-imports the BYOK wall the
  idea's whole architecture avoids.

## Minimal feature set (for the planner)

1. Curated, length-graded seed library of public-domain passages, plus
   paste-your-own (kept local/private).
2. Condense step: per-sentence hint capture; on completion the original is
   vaulted until the interval passes.
3. Enforced delay with visible ripeness state across a pipeline of passages;
   calendar-file export as the reminder mechanism.
4. Reconstruct step: writing surface showing hints only.
5. Deterministic sentence-alignment view: matched pairs side by side,
   omissions/additions/length-and-structure gaps highlighted in color.
6. Ledger: every passage, hints, attempt, and alignment, dated; recovered-
   substance trend; plain-file export.
7. First-run micro-drill and seeded demo state (conditions 2 and the
   staging first-minute requirement).

Signature moment, nameable in one sentence: days after hinting a passage,
you rebuild it blind and the tool lays your sentence beside the master's
with everything you flattened marked in color.
