# HANDOFF — picking this project up in a new chat

Read this first, then `README.md` for depth. This file is orientation and open items;
the README is the reference.

**Repo:** https://github.com/Awsdaman/Saudi96 (private) · `main` · working dir
`C:\Users\Aous\Games\SaudiKnowledge`

**Web build:** `.github/workflows/pages.yml` deploys `main` to GitHub Pages. It is committed
and verified against a subpath build, but **Pages is not enabled yet** — that is a repository
setting (Settings -> Pages -> Source: GitHub Actions), and the repo must be public or on a
plan that allows Pages on private repos. Until then the game runs from `npm run dev` or
`dist/index.html` only.

---

## What this is

**هل تعرف السعودية؟** — an Arabic-only, fully RTL Saudi knowledge quiz game. It runs on the
user's own PC and is played **on a projector in a majlis**, not on a phone. That single fact
drives every UI decision: big type, big images, readable from across a room, and a separate
presenter window so the host can see the answer while the players cannot.

Not published, no backend, no network at runtime. All content is JSON on disk, all images
are local files, scores live in `localStorage`.

Built from a research pack at `C:\Users\Aous\Downloads\saudi-game-research-pack.md`.

---

## Current state — everything below works

| | |
|---|---|
| Rounds | 7 (six subject rounds + لعبتي custom builder) |
| Trivia questions | 285 across 13 categories |
| Entities | 74 — 69 with a logo, all 69 hand-cropped to symbol-only |
| Landmarks | 44 — 35 with a reviewed photo |
| Regions / dishes | 13 / 13 |
| People | 58 in 8 groups — 44 with a portrait → 102 questions |
| Surfaces | 2 — `night` (device) and `stage` (projected); see README |

`npm run validate`, `npm run lint` and `npm run build` all pass. A clean `git clone` +
`npm install` + `npm run build` was tested end to end and produces a working `dist/`.

---

## Commands

```bash
npm run dev            # http://localhost:5173
npm run build          # → dist/index.html, opens from disk with no server
npm run validate       # content integrity — run after ANY data edit
npm run lint
npm run fetch          # waits out Wikimedia rate limits, then fetches all missing assets
npm run review:people  # regenerates public/people-review.html (portrait contact sheet)
npm run export-crops   # copies logo originals to crop-me/ as PNG for hand-cropping
npm run import-crops   # pulls finished crops from crop-me/done/ back in
```

---

## Traps that already cost time — do not rediscover these

**1. `file://` needs three things, all of them.** `base: './'` + `format: 'iife'` +
`scripts/postbuild.mjs` adding `defer`. Drop any one and the built page is blank. Browsers
block ES modules over `file://` (opaque origin). The postbuild script *fails the build* if
`defer` goes missing, deliberately. See README → "Running it".

**2. Numeric ranges reverse in Arabic.** `1975–1982` renders on screen as `1982–1975` — a
dash between two numbers resolves as right-to-left. Always write `من 1975 إلى 1982`.
`npm run validate` now fails on any numeric range in user-facing text. This was found only
by screenshotting the real page; the data looked perfect.

**3. `insetInlineStart` means *right* on an RTL page.** It silently mirrored a crop. Use
explicit `left`/`right` when the geometry is about the image, not the reading direction.

**4. Latin/number runs need `.ltr` isolation.** A bare `+254` in an Arabic sentence renders
`254+`. Wrap the whole token, sign included, in `<span className="ltr">`.

**5. Wikimedia: use `ii.thumburl`, never `ii.url` or a hand-built md5 CDN path.** The
latter two are rate-limited to death (429). Run **one** fetch script at a time. See
README → "On Wikimedia rate limits".

**5b. The stage surface must never scroll, and the lock belongs to `.play` alone.** Putting
`overflow: hidden` on the root instead strands «ابدأ» below the fold on the pre-round screen,
so opening the presenter window makes the game unstartable. And on the play screen the image
must be the element that absorbs leftover height (`flex: 1 1 0`); give it a fixed `vh` or an
`aspect-ratio` and the bottom row of answers is clipped off the wall with no way to scroll to
it — invisible to the room and to any check that only tests *document* scroll.

**6. The presenter window uses `postMessage`, not `BroadcastChannel`** (same-origin channels
fail on `file://`), and is opened with `<a target="_blank" rel="opener">`, not
`window.open` (popup blockers). `rel="opener"` is required — browsers sever `window.opener`
by default. The handshake captures the window handle from `e.source` because an anchor
gives no handle back.

**7. Rejected images are recorded, not just deleted.** `scripts/rejected.json`,
`rejected-landmarks.json` record *why* an image was wrong, so a later pass cannot silently
re-download it. `scripts/manual-symbols.json` locks the user's hand-crops against being
overwritten by `make-symbols.mjs`.

**8. Every fetched image gets eyeballed before it counts as done.** Nine wrong images got
through automated checks and were caught only on a contact sheet — a minister's photo filed
as a ministry logo, a map filed as a giga-project, a photo of Oman filed as a Saudi
mountain. The two failure modes are *a plausible photo of the wrong thing* and *a real
artifact that isn't the subject*. No script can catch either.

---

## Where things live

```
src/
  game/
    types.ts        RoundId, Question, Entity, RoundMeta, Difficulty
    content.ts      ← the heart. All question generators, ROUNDS metadata,
                      pool sources for the custom round
    engine.ts       shuffle, scoring, streaks
    useGame.ts      round state machine
    presenter.ts    postMessage channel to the presenter window — two-way:
                    state out, host commands back
    useSurface.ts   flips the root between the night and stage surfaces
    useCountUp.ts   animates the score; settles on a timer because rAF
                    is suspended while the window is hidden
    storage.ts      best scores + remembered round length in localStorage
  screens/          Home, RoundIntro, Play, Results, LogoRound, LogoResults,
                    CustomBuilder, Presenter
  components/       AnswerGrid, RevealImage, ScoreBar, LogoCard, HowToModal, RoundIcon,
                    TimerRing, Verdict
  data/             entities · landmarks · regions · dishes · people · trivia (+ *-assets manifests)

scripts/            fetch/convert/crop/validate pipeline — see README → "Asset pipeline"
public/assets/      logos · logos-symbol · logos-source (originals) · landmarks · people
public/fonts/       Thmanyah Sans + Serif Display
```

**`src/game/content.ts` is where almost every content change lands.** Adding a round, a
question type, or a category means touching it and `src/game/types.ts`.

---

## The people round — the most recently built part

58 people in 8 `group`s (ministers, kings, governors, astronauts, athletes, artists,
business, historic). Each generates up to two questions:

- **photo question** — «من هذه الشخصية؟» (only for the 44 with a portrait)
- **fact question** — driven by `factKind`, needs no photo, so the other 14 still play:

| `factKind` | Question | Options drawn from |
|---|---|---|
| `role` | أي منصب يتولّاه X؟ | other ministers' posts |
| `reign` | في أي فترة حكم X؟ | other kings' reigns |
| `region` | أي منطقة يحكمها X؟ | other regions |
| `fame` | بماذا اشتُهر X؟ | what other notable figures are known for |

**Distractors come from the person's own group first**, widening to the `factKind` pool and
then to everyone only when a group is too small to fill four options. Without this a king's
b&w photo would be offered against three ministers' names and the answer gives itself away.

`fem: true` switches prompts to the feminine form. Currently only Rayyanah Barnawi.

Adding people: probe **before** writing anything into `people.json` —

```bash
node scripts/probe-titles.mjs <file.json> [ar|en]   # does the article exist? does it have a photo?
node scripts/probe-intro.mjs  <file.json> [ar|en]   # first sentence — confirms identity and post
```

`probe-intro` is what catches a *correct-looking but wrong* person; it prints the post and
year. All 13 governors were confirmed this way, which is how the 2025 Jazan change was found.

---

## ⚠️ The one file that goes stale by itself

**`src/data/people.json`.** A royal order can change it any day. Six names in the user's
original list were already wrong when this round was built, and two 2026 changes are still
reported incorrectly by most secondary sources:

- **Industry & Mineral Resources** — Prince Abdulaziz bin Salman holds it *alongside* Energy
  since 11 July 2026; Bandar Alkhorayef moved to Minister of State.
- **Investment** — Fahad Al-Saif since 12 February 2026, replacing Khalid Al-Falih.
- **Jazan governor** — Prince Mohammed bin Abdulaziz bin Mohammed since 8 May 2025.

**Re-verify before any event where this game is presented.**

---

## Open items

**Assets still missing** (all non-blocking — the game plays around every gap):

- 14 people without a portrait: 6 ministers (Culture, Sport, Communications, Media,
  Environment, Islamic Affairs), 7 governors (Eastern, Tabuk, Ha'il, Jazan, Najran,
  Al-Baha, Al-Jouf), and Imam Muhammad bin Saud. No free image exists on Wikipedia or
  Commons. If one turns up, add it to `scripts/people-commons.json` and `npm run fetch`.
- 2 entities without a logo: الدرعية, معادن.
- 9 landmarks without a photo; 2 of those are deliberate rejects (مرايا, مبنى وزارة الخارجية
  have no article; جبل القارة and قرية الفاو are permanently rejected — see README).
- Dish photos: the weakest category for free imagery. The research pack's advice stands —
  shoot your own, or ask the Culinary Arts Commission.

**Ideas discussed but not built:**

- More people: businesspeople beyond the two, more historical figures, regional
  deputy governors.
- Tier A/B is `tierVerified: false` for most entities. No gameplay effect today — every
  logo uses the blur mechanic regardless — but it matters if symbol-only marks are added.

**Housekeeping:**

- `public/assets/logos-source` (25 MB of pre-crop originals) ships into `dist/` because it
  sits under `public/`. Nothing loads it at runtime. Moving it to a top-level
  `assets-source/` would slim the build; three scripts reference the path.
- `crop-me/` is gitignored — it holds the user's hand-cropping workspace. The originals are
  in `public/assets/logos-source` and the finished crops in `logos-symbol`, both committed,
  so nothing is at risk.

---

## Conventions worth keeping

- **Arabic only**, `dir="rtl"` at the root. No English strings in the UI.
- **Western numerals (0-9)** everywhere — matches Saudi UI convention and the existing data.
  `people.json` was normalised to this; don't reintroduce ٠-٩.
- **Code comments are in Arabic**, matching the existing files.
- Run `npm run validate` after every data edit. It catches missing images, broken
  `entityId` references, duplicate ids, too-few distractors, and reversed numeric ranges.
