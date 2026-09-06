# هل تعرف السعودية؟ — SaudiKnowledge

An Arabic-only, RTL Saudi knowledge quiz game that runs locally on your PC.
Built from `saudi-game-research-pack.md`.

**Picking this up in a fresh session? Start with [`HANDOFF.md`](HANDOFF.md)** — current
state, open items, and the traps that already cost time. This file is the reference behind it.

## Running it

```bash
npm run dev
```

Then open http://localhost:5173.

To build a copy you can open straight from disk (no server):

```bash
npm run build
```

Then double-click **`dist/index.html`**.

### On the web — GitHub Pages

`.github/workflows/pages.yml` builds and publishes on every push to `main`. It runs
`validate` and `lint` first, so a broken content edit fails the deploy instead of shipping.

The repository is public and Pages is live at
**<https://awsdaman.github.io/Saudi96/>** — no server, no install, just the link.

The workflow builds `main` and force-pushes `dist/` to the **`gh-pages`** branch, which is
what Pages serves. It runs `validate` and `lint` first, so a broken content edit fails the
deploy instead of shipping.

It does *not* use `actions/deploy-pages`. That path calls the Pages REST API to create the
site, and the workflow token is refused there — `Resource not accessible by integration` —
because this repository's Actions token is read-only by default. Pushing a `gh-pages` branch
to a public repository enables Pages without touching that API at all. (Before the repo was
public, the same step failed for a different reason: Pages is disabled outright on private
repos on the free plan.)

Once enabled the game is at `https://<user>.github.io/Saudi96/` and needs no further setup:

- `base: './'` makes every URL relative, so the project subpath (`/Saudi96/`) just works.
- The whole app is one screen with no routes, so no 404 fallback or rewrite rule is needed.

The deployed site is about 32 MB — `scripts/postbuild.mjs` drops
`assets/logos-source` (the 25 MB of pre-crop originals) from `dist/`, since nothing reads it
at runtime. The originals stay in the repository for the cropping scripts.

### On another machine

The repo does not carry `dist/` — it is rebuilt from source. On the other machine, with
**Node 20 or newer** installed (built on Node 24):

```bash
git clone <repo-url> SaudiKnowledge
cd SaudiKnowledge
npm install
npm run build
```

Then open `dist/index.html`. Nothing else is needed — no server, no network, no API key;
the whole game including every image is on disk.

If that machine has no Node at all, build here and copy the `dist/` folder across by USB or
cloud drive. It is fully self-contained and opens the same way.

Note the root `index.html` is Vite's *source* template — it points at `/src/main.tsx` and
shows a blank page if opened directly. Always open the one inside `dist/`.

Three build settings exist specifically so `file://` works, and all three are required:

- `base: './'` — relative asset paths instead of absolute `/assets/…`
- `format: 'iife'` — browsers block ES modules over `file://` (CORS, origin `null`), so the
  bundle must not be a module
- `scripts/postbuild.mjs` — strips `type="module"` / `crossorigin`, and **adds `defer`**.
  That last part matters: ES modules defer by default, plain scripts don't, and the tag sits
  in `<head>` — without `defer` the bundle runs before `<div id="root">` exists and the page
  stays blank. The script fails the build if `defer` is ever missing.

## The home screen

One page: a title, a topic grid of seven cards, and a setup panel that appears beside the
grid once a card is picked (round length, a «كيف تلعب؟» link, and «ابدأ الجولة»). Picking a
round starts play directly — there is no separate pre-round page. Each card carries its own
round colour and Sadu tapestry pattern (`src/game/roundTheme.ts`, `useRoundTheme.ts`), which
also tints the whole Play screen (`--green-bright`, `--round-carpet`) while that round runs.

**Portrait photos get two columns.** A portrait in a full-width frame leaves four fifths of
it empty and holds the face to roughly a third of the frame's height. `.play.has-image`
switches to a two-column grid on wider screens — image down one side, prompt and answers
down the other — which spends the width on the face instead of empty margin.

## The seven rounds

The topic grid on the home screen has seven cards (2 columns, 1 on narrow screens).

| Tile | What it asks | Format |
|---|---|---|
| خمّن الشعار | Identify an entity from its **symbol alone** | Flashcards, no timer, no options |
| خمّن المعلم | Identify a landmark | Multiple choice, zoom reveal |
| خمّن المنطقة | Regional capitals and scenes | Multiple choice |
| خمّن الطبق | The 13 official regional dishes | Multiple choice |
| أسئلة معرفية | 285 questions across 13 categories | Multiple choice |
| خمّن الشخصية | Identify a king, minister, governor or notable figure — or name their post, region, reign or claim to fame | Multiple choice |
| لعبتي | Pick any mix of categories and build your own round | Multiple choice |

Only the logo round *requires* images. The others generate text questions when an image is
missing, so the game stays playable while assets are still being gathered.

### Setting up a round

Picking a topic card opens the setup panel beside the grid instead of a separate page:

- **كم سؤال؟** — 5 / 10 / 15 / 20 / الكل, styled as radio rows with a filled dot. Choices
  above the pool size are hidden, so a 13-question round offers only 5 / 10 / الكل (13). The
  last choice per round is remembered in `localStorage`.
- **كيف تلعب؟** — per-round instructions, from `howTo` in `ROUNDS` (`src/game/content.ts`),
  opened in `HowToModal`. Also reachable mid-round via the same button.

There used to be a separate presenter window for hosting in front of a group (a second
screen showing the answer, with its own remote-control commands); it was removed to keep
the game a single self-contained screen.

### لعبتي — the custom round

`CustomBuilder` lists every source with its question count: the four rounds plus all 13
trivia categories. Pick any combination and a length (10/15/20/30) and it mixes them into
one game. Logo questions appear here in **multiple-choice** form — the flashcard format
belongs to the dedicated round.

## How the logo round works (خمّن الشعار)

The round shows the **symbol only, with the name cropped out**, no timer and no options.
You look, guess in your head, press «اعرض الإجابة», then judge yourself: عرفتها / ما عرفتها.
The score is `known / total`, and the results screen lists the ones you missed for review.

### Where the symbols come from

All 69 symbols were **cropped by hand** and imported with `npm run import-crops`. Each is
recorded in `scripts/manual-symbols.json`, which makes `make-symbols.mjs` skip it — so
re-running the automatic pipeline can never overwrite that work.

The workflow, if you add more:

```bash
npm run export-crops   # copies every full logo to crop-me/ as PNG
# crop them, save into crop-me/done/ with the same filename
npm run import-crops   # installs them and locks them
```

Filenames are `<id>__<arabic name>.png`; the importer reads the id before the `__`.

### Why cropping, and not deleting the text

The wordmarks are **baked into path outlines, not `<text>` elements** — there is not a
single `<text>` node across the 25 SVG logos. The letters of «وزارة الخارجية» are geometry,
indistinguishable in the markup from the palm and swords. Nothing can strip them
programmatically, so each logo carries a `crop` rectangle in `entities.json` instead.

Crops were derived by rendering every logo to a canvas and measuring row-by-row ink density
to find the blank gap between the symbol and the text below it, then reviewed by eye and
corrected by hand where the detection failed (10 of them). **34 of 39 logos are cropped.**
The other 5 are wordmarks with no separate symbol (gosi, stc, aramco, absher, splonline) and
are shown whole, as intended.

Two details that matter if you adjust a crop:

- Coordinates are fractions of a **square** that contains the whole image
  (`object-fit: contain`) — the same space the analysis used. `LogoCard` rebuilds that square.
- It uses `left`, **not** `inset-inline-start`. The page is RTL, so the logical property
  flips the crop to the wrong side of the logo.

Values live in `scripts/crops.json`; `node scripts/link-crops.mjs` writes them into
`entities.json`.

## Tiers: symbol-only vs. shared emblem

Roughly **58 Saudi government entities share the national emblem** (crossed swords + palm).
Cropping to "just the symbol" would produce dozens of identical puzzles, so entities are
tiered in `src/data/entities.json`:

- **Tier A** — has a unique symbol, hand-cropped to its own file with no wordmark in it
  (see "Where the symbols come from" above). Shown **as-is, immediately** — cropping already
  removed the name, so there is nothing left to hide and no reason to obscure the shape
  first. An earlier version faded it in from a black silhouette; that only made an
  already-fair guess harder for no benefit, since the icon itself never gave the answer
  away, and was removed.
- **Tier B** — emblem-based, no separate symbol exists. Shown as the **full lockup with the
  Arabic wordmark blurred**, clearing as the timer runs — colour and composition are the
  clues, since the wordmark is the only part that would otherwise give the answer away.

## Asset pipeline

```bash
npm run fetch      # download logos + landmark images, then link and validate
npm run validate   # check content integrity without touching the network
```

Sources, in order of preference: Wikidata `P154` (logo property) → Arabic Wikipedia lead
image → English Wikipedia lead image.

Files:

- `scripts/wiki-titles.json` — entity id → Arabic Wikipedia article title
- `scripts/landmark-titles.json` / `-en.json` — the same for landmarks
- `scripts/people-titles.json` — person id → Arabic Wikipedia article title
- `scripts/people-commons.json` — person id → a Wikimedia Commons file, for the cases where
  the article has no image or a poor one. **Overrides** the article's own image, so it also
  serves as the upgrade path when a 200×250 thumbnail is all Wikipedia offers.
- `scripts/rejected.json` — images reviewed and found not to be logos
  (`mim` was a photo of a person, `neom` was a map)
- `scripts/rejected-landmarks.json` — the same for landmarks (`alfaw` was a museum artifact
  in a vitrine, `qarah` was a photo of Oman)

  Both fetchers skip these permanently, and each entry records *why* — so a later pass
  doesn't quietly re-download the same wrong image.
- `src/data/assets.json` — the manifest: file → source URL. Re-run `npm run fetch` after a
  rebrand rather than hunting for the file again.

Two probes make adding people cheap — run them *before* writing anything into
`people.json`, so a name that has no article or no photo is known up front:

```bash
node scripts/probe-titles.mjs <file.json> [ar|en]   # هل توجد الصفحة؟ ولها صورة؟
node scripts/probe-intro.mjs  <file.json> [ar|en]   # أول سطر من المقالة — للتحقق من الهوية
```

Both take a `{ "id": "عنوان المقالة" }` map. `probe-intro` is the one that catches a
*correct-looking but wrong* person: it prints the article's first sentence, which states
the post and the year — that is how each of the 13 governors was confirmed.

**Reviewing what was fetched:** `npm run dev`, then open

- http://localhost:5173/contact-sheet.html — every downloaded logo on one page
- http://localhost:5173/contact-sheet-landmarks.html — every downloaded landmark photo

Automatic lead-image lookup sometimes grabs a building, a map or a minister's portrait; this
is how you catch them. Add the id to `scripts/rejected.json`, delete the file, and re-run.

### On Wikimedia rate limits

Wikimedia returns `429` and throttles `upload.wikimedia.org` under sustained bulk
downloading, and the penalty deepens the harder you retry. Two lessons from the initial
build:

1. **Resolve URLs through the API, don't construct them.** A CDN path derived from the
   filename's md5 gets `429`; the URL the `imageinfo` API returns for the same file — with
   its `utm_*` parameters — is served normally. `fetch-assets.mjs` resolves through the API
   for this reason.
2. **Run one fetch at a time.** Two concurrent passes starve each other and make the
   throttling worse.

`npm run fetch` skips files already on disk, so re-running is cheap and safe. If a run
returns mostly `429`, stop and try again later rather than retrying immediately — the
remaining files are waiting on their side, not yours.

## Image credits

Every image comes from Wikimedia Commons or a Wikipedia, and each keeps its original
licence. `src/data/credits.json` records the licence, author and file page for all 135, and
the **مصادر الصور** screen (linked from the home screen) renders them grouped by obligation.

```bash
npm run fetch-credits   # re-reads licences from the Wikimedia API
```

The fetcher asks for **50 files per request**, not one per file. One request per file
exhausts the API quota and comes back `429`, which looks identical to "the file has no
licence" — the first run of this script reported 129 of 135 as unlicensed for exactly that
reason. Batched, the whole set takes five requests.

What the licences actually say:

| | Count | Obligation |
|---|---|---|
| CC BY / CC BY-SA | 64 | credit the author and name the licence |
| Public domain / CC0 | 43 | none |
| Other free licences | 2 | varies |
| **Non-free (fair use)** | **26** | **see below** |

**The 26 non-free ones need a decision before this is published.** They are ministry and
authority logos uploaded to Arabic Wikipedia under a fair-use rationale written for an
encyclopaedia article. Fair use does not travel with the file: a rationale that covers an
encyclopaedia entry about a ministry does not automatically cover a game hosted elsewhere.
Using a logo to identify the body it belongs to is a weak, defensible use, and this is a
non-commercial educational game — but it is not the same permission as CC-BY, and the
credits screen says so rather than implying a licence that does not exist.

## Content

`src/data/` holds all content as plain JSON:

| File | Contents |
|---|---|
| `entities.json` | 74 entities — 24 ministries, 11 Ministry of Culture commissions, 16 authorities, 11 companies, 5 giga-projects, 3 apps, 4 clubs |
| `landmarks.json` | 44 landmarks, including all 8 UNESCO World Heritage Sites |
| `regions.json` | The 13 regions and their capitals |
| `dishes.json` | The 13 official regional dishes |
| `people.json` | 58 people in 8 groups — 24 cabinet members, the 7 kings, the 13 regional governors, 3 astronauts, 4 athletes, 3 musicians, 2 business leaders, 2 historic figures. Each carries a `group` (which pool its distractors come from) and a `factKind` (which second question it generates) |
| `trivia.json` | 285 questions across 13 categories — geography, regions, history, landmarks, culture & food, nature reserves & wildlife, Vision 2030, economy & energy, sport, notable figures, government, science & tech, heritage & customs |

Difficulty runs 1–4 as in the research pack: 1 is common knowledge, 4 is the deliberate
traps (jareesh not kabsa as the national dish; Sakaka as Al-Jawf's capital; the
Jabal Sawda / Jabal Ferwa dispute).

## Fonts

Thmanyah — Sans for the interface, Serif Display for the title and score.
Files live in `public/fonts/`.

## Icons

`src/components/RoundIcon.tsx` — six line icons drawn as inline SVG on a 24×24 grid, all
`currentColor` so they follow the theme.

## The people round

Every person generates up to two questions: a **photo question** («من هذه الشخصية؟») for
anyone with a portrait, and a **fact question** that needs no photo — so the 14 people
without a usable free portrait still play.

`factKind` decides the fact question and, critically, **where its wrong answers come from**:

| `factKind` | Question | Options are |
|---|---|---|
| `role` | أي منصب يتولّاه X؟ | other ministers' posts |
| `reign` | في أي فترة حكم X؟ | other kings' reigns |
| `region` | أي منطقة يحكمها X؟ | other regions |
| `fame` | بماذا اشتُهر X؟ | what other notable figures are known for |

Photo-question distractors come from the person's own `group` first, widening to the
`factKind` pool and then to everyone only when a group is too small to fill four options
(astronauts are 3, business leaders 2). Without this a king's photo would be offered
against three ministers' names and the b&w photo alone would give it away.

Two details that are easy to get wrong when adding people:

- **Reign spans are written «من 1975 إلى 1982», never «1975–1982».** In an Arabic
  paragraph a dash between two numbers is resolved as a right-to-left character, so the
  range renders *reversed* — the player reads 1982–1975. `npm run validate` fails on any
  numeric range in user-facing text for this reason.
- **`fem: true`** switches the prompt to the feminine form («بماذا اشتُهرت»، «من رائدة
  الفضاء هذه؟»). Currently only Rayyanah Barnawi.

## Keeping the cabinet current

`src/data/people.json` is the one file in this project that **goes stale on its own** — a
royal order can change it any day. Every name in it was verified against the
[Council of Ministers](https://en.wikipedia.org/wiki/Council_of_Ministers_of_Saudi_Arabia)
list, each governor against their own Arabic Wikipedia article, and Arabic news sources at
the time of writing, including two 2026 changes that most secondary sources still get
wrong:

- **Industry & Mineral Resources** — Prince Abdulaziz bin Salman holds it *alongside*
  Energy since 11 July 2026; Bandar Alkhorayef moved to Minister of State.
- **Investment** — Fahad Al-Saif since 12 February 2026, replacing Khalid Al-Falih.

Re-check before any event you host with this. `npm run review:people` regenerates
`public/people-review.html`, a contact sheet grouped by category — every portrait in this
round was checked on it, which is how the wrong-person failures below were caught.

## Known gaps

- **44 of 58 people have a portrait.** Six ministers (Culture, Sport, Communications,
  Media, Environment, Islamic Affairs), seven governors (Eastern Province, Tabuk, Ha'il,
  Jazan, Najran, Al-Baha, Al-Jouf) and Imam Muhammad bin Saud have no freely licensed
  photo — Wikipedia has an article but no image, and Commons has nothing. They still play:
  their fact question needs no photo. If a portrait turns up, add it to
  `scripts/people-commons.json` and re-run `npm run fetch`.
- **69 of 74 entities have a logo, all 69 with a hand-cropped symbol.** Two still need one
  (Diriyah, Ma'aden); three are permanently rejected (see below).
- **35 of 44 landmarks have photos**, each reviewed and correct. The
  rest were cut off by the same rate limit. Landmarks without a photo fall back to a text
  clue, so the round stays playable; `npm run fetch` converts them to zoom-reveal photos as
  they arrive.
- **Two landmarks are deliberately photo-less.** Jabal Al-Qarah's English title
  ("Al-Qarah Mountain") resolves to the Qara mountains in Oman and returned a photo of
  Salalah; its English fallback was removed rather than left to grab the wrong country
  again. Qaryat al-Faw returned a bronze head in a museum vitrine — genuinely from the site,
  but unrecognisable as a place and useless for "which landmark is this?".

  These are the two failure modes to watch for in every new batch: **a plausible photo of
  the wrong place**, and **a real artifact that isn't the landmark**. Neither looks wrong at
  a glance in the contact sheet, so check images against what you know the place looks
  like — that judgement is the part the pipeline cannot make.
- **Tier A/B is unverified** for most entities (`tierVerified: false`). It has no gameplay
  effect today, since every logo uses the blur mechanic regardless. It starts to matter once
  symbol-only marks are added.
- **Dish photos** are the hardest category for free imagery. The research pack's advice
  stands: shoot your own, or ask the Culinary Arts Commission for the set they photographed
  for the announcement campaign.
