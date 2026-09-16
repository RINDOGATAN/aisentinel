# AI governance frameworks wheel

A learning aid, not legal advice. Twelve AI governance frameworks compared on
fourteen dimensions, as one self-contained page (`index.html`, no external
libraries or fonts) with four views: wheel, table, compare, and a picker that
suggests which frameworks to start from.

| File | Purpose |
|---|---|
| `frameworks.json` | The data: frameworks, rings, cells (depth 0 to 3, summary, source), AI Sentinel modules, picker rules. Reusable on its own. |
| `build.mjs` | Writes `index.html` from the data. |
| `check.mjs` | Validates the data (every ring present, depth, summary, source or "to verify", no long dash, ISO dates) and prints the "to verify" count per framework. |
| `smoke.mjs` | Runs the page script against a minimal fake DOM and exercises the wheel, panel, compare and picker. |

```bash
node docs/frameworks-wheel/check.mjs
node docs/frameworks-wheel/build.mjs
node docs/frameworks-wheel/smoke.mjs
open docs/frameworks-wheel/index.html
```

## Editing rules

- Every cell carries a `source` with `ref` (article, clause, section or
  function) and an official `url`, plus `file` when the fact came from this
  repository. A cell that cannot be checked against the official text gets
  `"status": "to verify"` and is drawn hatched.
- Never add an article number, a date or a penalty that the official text
  does not state. Dates are written in ISO form (YYYY-MM-DD).
- Say that AI Sentinel "supports" or "maps to" a dimension; never that it makes
  anyone compliant or certified.
- Update `asOf` whenever content changes, then rebuild.

## Picker rules

Each rule adds its `score` to a framework when every condition in `when`
matches (any of the listed values). Rules marked `binding` rank first. The
suggested stack takes the first matching rule in `stack.managementSystem` and
`stack.riskMethod`; the last rule in each list has no conditions. The page
prints all rules under "Why this result".
