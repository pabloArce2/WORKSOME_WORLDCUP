# World Cup Probability Model

This app keeps all tournament probability logic in one place:

- `src/services/probabilityModel.js`

The live data adapter in `src/services/sportsDbApi.js` fetches teams, fixtures, and results, then calls the model. UI components only display the output.

## Running A Report

Use this to print the current top teams from the same model used by the dashboard:

```powershell
npm run probabilities
```

You can pass a row limit:

```powershell
npm run probabilities -- 20
```

## Inputs

The model receives:

- `groups`: current group tables and teams.
- `matches`: World Cup matches from TheSportsDB.
- Team metadata from `src/assets/data/teamMeta.js`.
- Base team ratings embedded in `probabilityModel.js`.

The model does not call the API directly. That separation keeps fetching and prediction logic independent.

## Model Pipeline

1. Collect all teams from groups and matches.
2. Assign each team a pre-tournament rating.
3. Update ratings from played matches.
4. Simulate remaining group matches.
5. Select teams for the 2026 knockout format.
6. Simulate knockout rounds.
7. Return per-team probabilities.

## Ratings

Each team starts with an Elo-style base rating. Strong favorites start above 2000, mid-level teams sit around 1700-1900, and lower-rated teams sit closer to 1500-1650.

If a team is missing from the hardcoded rating table, the model falls back to local `fifaRank`, then `preOdds`, then `1600`.

Played matches update ratings using:

```text
expected = 1 / (1 + 10 ^ ((opponentRating - teamRating) / 400))
actual = 1 for win, 0.5 for draw, 0 for loss
marginMultiplier = log(goalMargin + 1) * 0.8 + 1
ratingChange = 22 * marginMultiplier * (actual - expected)
```

So a surprising win moves ratings more than an expected win, and bigger margins matter without becoming absurd.

## Match Simulation

Unplayed matches are simulated with Poisson goals. Rating difference adjusts expected goals:

```text
homeExpectedGoals = 1.35 + ratingDiff / 650
awayExpectedGoals = 1.15 - ratingDiff / 700
```

Both values are clamped between `0.35` and `3.4`.

Knockout draws are resolved with a rating-based win probability:

```text
winProbability = 1 / (1 + 10 ^ (-ratingDiff / 400))
```

## Tournament Format

For 2026 groups:

- Top 2 teams from each group advance.
- The 8 best third-place teams also advance.
- The knockout stage starts with 32 teams.

If the app ever has fewer than 12 groups, the model falls back to the older top-2-from-each-group behavior.

## Simulation Details

The model runs deterministic Monte Carlo simulations:

- Default simulations: `900`
- Pre-tournament seed: `20260611`
- Current/live seed: `20260615`

Deterministic seeds prevent the dashboard from flickering with random probability changes on every refresh.

## Outputs

Each team receives:

- `preTournamentProbability`
- `championProbability`
- `currentWinProbability`
- `groupAdvanceProbability`
- `roundOf32Probability`
- `roundOf16Probability`
- `quarterFinalProbability`
- `semiFinalProbability`
- `finalProbability`
- `baseRating`
- `liveRating`
- `formRatingDelta`

These are attached back onto group teams and match teams.

## Where The App Uses It

- `UserBanner.vue`: user team's current chance and pre-tournament chance.
- `GroupTable.vue`: live win chance per team.
- `StatsPanel.vue`: live favorites ranking.
- `AssignPage.vue`: stores the current smart probability when a user draws a team.

## Limitations

This is a practical sweepstake model, not a bookmaker model. It does not include injuries, squad news, travel, rest days, betting-market odds, or exact FIFA rankings pulled live. The most important features are covered: prior strength, real results, margin of victory, group position, remaining path, and number of teams left.
