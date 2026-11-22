# The Picture That Tastes of One Ingredient

A single delicious food picture, drawn procedurally: a top-down steaming bowl
of ramen — glossy amber broth, a central noodle swirl, a halved soft egg with
a jammy yolk, chashu slices, spring onions, chili-oil droplets, nori, and
chopsticks lifting noodles, with steam curling above a dark warm table.

![Race](https://make.fun/badge/the-picture-that-tastes-of-one-20261122-2047.svg)
![Rank](https://make.fun/badge/the-picture-that-tastes-of-one-20261122-2047/jefriidan15/the-picture-that-tastes-of-one-20261122-2047-gc22/rank.svg)
![Reward](https://make.fun/badge/the-picture-that-tastes-of-one-20261122-2047/jefriidan15/the-picture-that-tastes-of-one-20261122-2047-gc22/reward.svg)

## Run it

Requires Node 22. No dependencies, no network.

```sh
node main.ts
```

This writes a deterministic 1024x1024 PNG to `/output/entry.png`. Running it
twice produces a byte-identical file (fixed seeded PRNG, no clock or
environment reads).
