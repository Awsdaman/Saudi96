# هل تعرف السعودية؟ — SaudiKnowledge

## Song category — خمّن الأغنية

Songs use the same round-length setup, shuffled questions, streak bonus, results, and replay as the rest of the game. They also work in **لعبتي**. Each song is one question with three audio clues:

1. The first **3 seconds** from the start of the recording.
2. **لا أعلم** restarts from the beginning and plays the first **8 seconds**.
3. **لا أعلم** plays the famous section selected by the content editor.

Guess aloud, press **عرفت الأغنية**, then self-check the revealed title with **إجابتي صحيحة / إجابتي خاطئة**. The artist is optional supplementary information. A wrong self-check ends the question. **لا أعلم** in phase three reveals the answer and records a miss. Clue progression does not break a streak; a final miss does.

Correct answers earn **300 / 200 / 100** base points by phase, multiplied by the existing streak bonus (10% per preceding correct answer, up to 50%). Replays are free and thinking time is unlimited. If audio cannot load, retry or skip it without losing the streak; technical skips are excluded from accuracy. Audio stops when leaving, revealing an answer, opening help, or hiding the page. Use the play button when automatic playback is blocked.

### Prepare recordings

The five initial songs are registered as **drafts**. Their famous sections must be chosen by the user before they appear in games. Titles initially come from the supplied filenames and remain editable. No famous timestamps are guessed automatically.

1. Put MP3 originals in `Songs/`.
2. Run `npm run songs:scan` to discover new files and read their durations (or use the review page's scan button).
3. Run `npm run dev`, then open **http://127.0.0.1:5173/__songs/review**. The local home screen also links to it when the song category is selected. Use the address printed by Vite if the port differs.
4. Review the title/artist and listen to the first 3 and 8 seconds.
5. Seek to the famous section and set its start/end, either using the current audio position or entering `MM:SS` / seconds. The suggested length is 15 seconds; the allowed range is 1–60 seconds.
6. Preview the section, check the review confirmation, and click **اعتماد الأغنية وتجهيزها للعب**.

Approval generates three independently bounded MP3 clips in `public/assets/songs/` and updates `src/data/songs.json`. Neutral clip filenames and removed title/artist/artwork metadata avoid accidental clues. Originals stay untouched. Only ready songs enter standalone or mixed pools; an empty song category explains what is pending. Returning a song to drafts removes it from future rounds.

The editor is available only on a **local Vite development server** and accepts edits only from that server's own origin on loopback. It is not included in the published or disk build. At runtime the browser loads prepared audio files directly, with no audio API or server. Commit the catalog and referenced prepared clips together when shipping approved songs. Originals are needed only for subsequent editing. Postbuild omits obsolete/draft clips.

FFmpeg is installed through the `ffmpeg-static` development dependency; no separate system installation is needed. `npm test` (Node 22.6+; verified on Node 24) checks phase/scoring state transitions, mixed rounds, input validation, and actual audio extraction, including source preservation, clip duration, clue position, and removed answer metadata. `npm run validate` checks ready-song timing and clip paths alongside existing content checks. The deployment workflow runs these tests before building.

The shared round state now gives **لعبتي** its own score identity instead of storing its scores under trivia. Existing saved scores are left intact. Valid custom round lengths are restored, capped to the current pool size.

Mixed rounds draw evenly across selected sources before shuffling the final order, so a large trivia bank cannot crowd songs out. Each selected source appears when the round has at least as many questions as sources. If the round is shorter, a random subset of sources is used; exhausted sources give their remaining slots to the others.

Built-copy background and tapestry URLs are also corrected so the shared visual identity loads from disk and under a hosted subpath.

---

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

### On the web — Vercel

The repository is connected to Vercel, which builds and deploys on every push to `main`.
The game is live at **<https://saudi96.vercel.app>** — no server, no install, just the link.
Vercel auto-detects the Vite project (build command `npm run build`, output directory
`dist`); `package.json`'s `engines` field pins a Node version Vite 8 supports.

- `base: './'` makes every URL relative, so it works the same at the site root (Vercel) or
  under a subpath (GitHub Pages, below).
- The whole app is one screen with no routes, so no rewrite rule is needed.

### On the web — GitHub Pages (built, not enabled)

`.github/workflows/pages.yml` also builds and publishes on every push to `main`, force-pushing
`dist/` to the **`gh-pages`** branch. It runs `validate` and `lint` first, so a broken content
edit fails the deploy instead of shipping — this part is fully verified.

**Pages itself is not turned on**, because this repository is private: GitHub Pages is
disabled outright on private repos on the free plan (Settings → Pages has no effect until
either the repo goes public or the account is on a plan that allows Pages on private repos).
Until then this workflow just keeps `gh-pages` current with no live URL.

It does *not* use `actions/deploy-pages`. That path calls the Pages REST API to create the
site, and the workflow token is refused there — `Resource not accessible by integration` —
because this repository's Actions token is read-only by default. Pushing a `gh-pages` branch
to a public repository would enable Pages without touching that API at all, once the repo is
public and Settings → Pages → Source is set to "Deploy from a branch" → `gh-pages`.

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
  Arabic wordmark blurred**, clearing over a fixed few seconds after the question appears
  (a self-playing CSS animation, not tied to any game timer — there isn't one) — colour and
  composition are the clues, since the wordmark is the only part that would otherwise give
  the answer away.

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
| `trivia.json` | 263 questions across 13 categories — geography, regions, history, landmarks, culture & food, nature reserves & wildlife, Vision 2030, economy & energy, sport, notable figures, government, science & tech, heritage & customs |
| `trivia-hard.json` | Hand-written hard-mode distractors (question id → 3 wrong answers), near-miss traps whose wrongness is certain — e.g. الدرعية for «ما عاصمة المملكة؟». Hard mode uses these first, then closer numbers for plain-number answers, else the normal options. `npm run validate` rejects unknown ids, duplicates, or the correct answer listed as wrong |

Difficulty runs 1–4 as in the research pack: 1 is common knowledge, 4 is the deliberate
traps (jareesh not kabsa as the national dish; Sakaka as Al-Jawf's capital; the
Jabal Sawda / Jabal Ferwa dispute).

## Fonts

Thmanyah — Sans for the interface, Serif Display for the title and score.
Files live in `public/fonts/`.

## Background

One fixed layer behind every screen (including the audience window and Credits), defined once
in `src/index.css` as `body::before`. The scene fills the viewport with `cover`; the two sadu
bands are separate tiles pinned to the left/right edges and repeated vertically, so the frame
stays whole at any window shape. The round colour tints it through `--green-bright`.

The three files (`bg-scene.jpg`, `bg-band-l.webp`, `bg-band-r.webp` in `public/assets/identity/`)
are generated from `play-bg.jpg` by `npm run make-background` — upscaled 3× and lightly sharpened
so they stay crisp on 1080p and 4K. To use a sharper original, replace `play-bg.jpg` (same layout
and proportions, or adjust the constants at the top of `scripts/make-background.mjs`) and rerun.
Screens must not add their own copy: `tests/background.test.mjs` fails if they do. Screens keep
their content off the bands with `--frame-gutter` (and `--frame-w` for the team scoreboard).

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

## Admin dashboard & analytics

Opening **`saudi96.vercel.app/swa`** shows a password-protected dashboard instead of the
game (`vercel.json` rewrites `/swa` to the same page and marks it `noindex` / `no-store`; the
path lives in `ADMIN_PATH` in `src/game/hostSync.ts`). The old `/admin` path was retired and
now returns 404. A `saudi96-admin.*` host also works if one is ever added under Settings →
Domains. It shows player suggestions, unique visitors (total and per day, Riyadh time), rounds started and
completed per category, accuracy per category, easy/medium/hard and team/solo/audience-screen
usage, average round length, and the most-missed questions.

- **Player suggestions**: «اقتراح أو إضافة للعبة» under «جهّز جولتك» on the home screen opens
  a text box (`src/components/FeedbackModal.tsx`). The text (3–1000 characters, control
  characters stripped) and its time are stored in the Redis list `sk:feedback`, newest 500
  kept; no visitor ID or address is stored with it. Each device and each address may send
  5 per hour. The dashboard lists the newest 200. Sending needs the live site — from
  `file://` the box explains that instead.

- **Tracking** (`src/game/analytics.ts`) is anonymous: a random ID per browser in
  `localStorage`, no names or personal data. Nothing is sent from `file://`, the audience
  tab, or the admin site itself. The dashboard therefore counts **devices**, not people: a
  group playing on one screen is one device; one person on two devices is two. Counts are
  exact (Redis sets); days before the switch to sets were HyperLogLog estimates and are
  still added in.
- **Closing the tab mid-round** still reports the answers given so far (`pagehide`); each
  answer is reported once even if the round is resumed from the browser's back cache.
- **«👁 اعرض لي الإجابة»**: with the audience screen open it is a private peek for the host
  plus ✓/✗ to judge the spoken answer (a ✓ scores normally; the audience sees nothing until
  then). With one screen it reveals and selects the answer as before, and is recorded as a
  host reveal — counted separately, never in accuracy.
- The dashboard refreshes itself when you come back to it (if its numbers are over 10
  minutes old), hourly while left open and visible, never while hidden, and instantly via
  «تحديث» (`src/admin/refresh.ts`). A refresh costs under 80 Redis commands — even left open
  all day every day that is about 11% of the free Upstash quota, leaving the rest for players.
- **Server** is one Vercel function, `api/events.ts`: `POST` records strictly validated
  events, `GET` returns aggregates only with the `x-admin-password` header. Ten wrong
  passwords from one address lock it out for 15 minutes.
- **Storage** is Upstash Redis over its REST API (no SDK).

One-time setup in the Vercel dashboard:

1. **Storage** tab → create an **Upstash for Redis** database (free plan) → connect it to
   this project. Vercel injects `KV_REST_API_URL` / `KV_REST_API_TOKEN` automatically.
2. **Settings → Environment Variables** → add `ADMIN_PASSWORD` (Production) with a long
   password of your choice.
3. Redeploy (Deployments → ⋯ → Redeploy) so the new variables take effect.

Locally, `npm run dev` serves the same function with an in-memory store
(`scripts/analytics-dev-plugin.mjs`); open `http://localhost:5173/?admin`, password `dev`.
Data resets when the dev server stops.

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
