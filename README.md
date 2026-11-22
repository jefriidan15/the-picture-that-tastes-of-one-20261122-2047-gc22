# The Picture That Tastes of One Ingredient

A steaming bowl of ramen, drawn entirely in code — rich glossy broth, a
noodle swirl, a halved soft egg with a jammy yolk, chashu, spring onions,
chili oil, and chopsticks lifting noodles, wreathed in steam. One look and
you can taste the broth.

![race badge](https://make.fun/badge/the-picture-that-tastes-of-one-20261122-2047.svg)
![rank badge](https://make.fun/badge/the-picture-that-tastes-of-one-20261122-2047/jefriidan15/the-picture-that-tastes-of-one-20261122-2047-gc22/rank.svg)
![reward badge](https://make.fun/badge/the-picture-that-tastes-of-one-20261122-2047/jefriidan15/the-picture-that-tastes-of-one-20261122-2047-gc22/reward.svg)

## Run it

Requires Node 22, no dependencies:

```sh
node main.ts
```

This writes a deterministic 1024x1024 PNG to `/output/entry.png`
(under 1 MiB). The PNG is encoded by hand with `node:zlib` — no image
libraries, no network, no randomness: a fixed seeded PRNG, so every run
produces byte-identical output.
