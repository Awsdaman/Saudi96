# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

هل تعرف السعودية؟ is an Arabic Saudi knowledge game. Players choose a topic or combine topics in لعبتي, choose a round length, guess, and review their results.

## Operating Context

The game runs in one browser screen, including on a shared screen for spoken guesses. It supports a local development server, a hosted static build, and a built copy opened directly from disk. There is no runtime backend or sign-in.

## Capabilities and Constraints

- Existing categories retain their rules and content.
- Song questions have three clues: the first 3 seconds, the first 8 seconds from the beginning, and a user-selected famous section.
- Song answers are spoken and self-checked after revealing the title. The artist is supplementary.
- Song base points are 300, 200, and 100 by clue phase, with the existing streak multiplier. There is no answer timer.
- Songs can be included in mixed rounds. Each song is one question and one scored outcome.
- The five initial recordings are supplied by the user. Their famous sections remain unapproved until the user selects them.
- Audio editing is a local preparation tool. Published gameplay uses only prepared clips and local storage.

## Brand Commitments

Retain the existing Arabic interface, RTL layout, Thmanyah typography, Saudi identity imagery, and category-based styling. This feature extends the existing game rather than redesigning it.

## Evidence on Hand

Runtime source is in src, game content is in src/data, original song recordings are in Songs, and existing visual assets are in public.
