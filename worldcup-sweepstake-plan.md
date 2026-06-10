# World Cup Sweepstake Generator — Build Plan

## Stack Decision

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vue 3 + Vite | As requested |
| Styling | Tailwind CSS v4 | Utility-first, fast iteration |
| Backend / DB | Firebase (Auth + Firestore) | Google Sign-In built-in, real-time DB, profile pictures free from Google OAuth, zero-server setup |
| Hosting | Firebase Hosting | Same ecosystem, free tier |
| Animations | GSAP or Vue's `<Transition>` + CSS | Smooth team-spin reel |
| Win Probability | Calculated client-side from FIFA rankings (static JSON seeded at app start) | No API cost, works offline |

---

## Project Structure

```
worldcup-sweepstake/
├── src/
│   ├── assets/
│   │   ├── teams/           # SVG/PNG flag images (32 teams)
│   │   └── data/
│   │       ├── teams.json   # team name, flag, group, FIFA ranking
│   │       └── groups.json  # group stage fixtures
│   ├── components/
│   │   ├── UserBanner.vue
│   │   ├── TeamReel.vue
│   │   ├── GroupTable.vue
│   │   └── BracketView.vue
│   ├── pages/
│   │   ├── LoginPage.vue
│   │   ├── AssignPage.vue
│   │   └── DashboardPage.vue
│   ├── stores/
│   │   └── user.js          # Pinia store
│   ├── router/
│   │   └── index.js
│   ├── firebase.js           # Firebase init
│   └── App.vue
├── firestore.rules
├── firebase.json
└── .env
```

---

## Phase 1 — Firebase Setup

**Goal:** Auth, DB, hosting configured before touching UI.

### Steps

1. Create a Firebase project at console.firebase.google.com
2. Enable **Authentication → Google** sign-in provider
3. Enable **Firestore Database** in production mode
4. Add your web app and copy the config into `.env`:
   ```
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_APP_ID=
   ```
5. Create `src/firebase.js`:
   ```js
   import { initializeApp } from 'firebase/app'
   import { getAuth, GoogleAuthProvider } from 'firebase/auth'
   import { getFirestore } from 'firebase/firestore'

   const app = initializeApp({ /* import.meta.env.VITE_* */ })
   export const auth = getAuth(app)
   export const provider = new GoogleAuthProvider()
   export const db = getFirestore(app)
   ```
6. Firestore rules — only authenticated users can read/write their own doc:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth.uid == uid;
       }
       match /config/teams {
         allow read: if request.auth != null;
       }
     }
   }
   ```

---

## Phase 2 — Data Layer

**Goal:** Seed all 32 teams and define the user document shape.

### `teams.json` shape
```json
[
  {
    "id": "brazil",
    "name": "Brazil",
    "flag": "/teams/brazil.svg",
    "group": "A",
    "fifaRank": 1,
    "color": "#009C3B"
  }
]
```

### Firestore `users/{uid}` document shape
```json
{
  "uid": "abc123",
  "displayName": "Pablo García",
  "photoURL": "https://lh3.googleusercontent.com/...",
  "email": "pablo@worksome.com",
  "teamId": "brazil",
  "assignedAt": "2026-06-10T10:00:00Z",
  "winProbability": 0.12
}
```

### Win probability calculation
- Formula: `(1 / fifaRank) / sum(1 / fifaRank for all remaining teams)`
- Computed once at assignment time, stored in Firestore
- Shown as a percentage on the dashboard

---

## Phase 3 — Router & Auth Guard

**Goal:** Three routes, protected correctly.

```js
// router/index.js
const routes = [
  { path: '/',        component: LoginPage },
  { path: '/assign',  component: AssignPage,    meta: { requiresAuth: true } },
  { path: '/dashboard', component: DashboardPage, meta: { requiresAuth: true, requiresTeam: true } },
]

// Navigation guard logic:
// - Not logged in → redirect to /
// - Logged in, no team → redirect to /assign
// - Logged in, has team → redirect to /dashboard
// - Direct access to /assign with team → redirect to /dashboard
```

---

## Phase 4 — Screen by Screen

---

### Screen 1: Login Page (`/`)

**Purpose:** Entry point. Sign in with Google.

**Layout:**
- Full-screen dark background (`#0D0014` near-black with purple tint)
- Centered card, vertically and horizontally
- World Cup 2026 logo / trophy SVG at top (large, ~200px)
- Headline: `"Worksome World Cup 2026"` — white, bold, large (text-4xl)
- Subheadline: `"Sign in to claim your team"` — purple-300, text-lg
- Google Sign-In button: white pill button with Google G logo, text `"Continue with Google"`, hover lifts with shadow
- Footer: small grey text `"Company internal use only"`

**Background:**
- `#0D0014` base
- Two large radial gradient blobs in purple (`#6B21A8` at 20% opacity) — one top-left, one bottom-right — done in CSS
- Subtle grid overlay (1px purple lines, 5% opacity) for a techy look

**Logic:**
1. Call `signInWithPopup(auth, provider)`
2. On success, check Firestore for `users/{uid}`
3. If doc exists and has `teamId` → navigate to `/dashboard`
4. If no doc → create doc with user info, no `teamId` yet → navigate to `/assign`

---

### Screen 2: Team Assignment (`/assign`)

**Purpose:** One-time animated team draw. Never shown again after team is set.

**Layout:**
- Same background as Login
- Top: `UserBanner` component (see component spec below)
- Center: Team reel — a slot machine / spinning wheel showing team flags cycling fast then slowing to a stop
- Below reel: `"SPIN"` button — large, purple gradient (`from-purple-600 to-purple-900`), glowing box-shadow in purple, white bold text
- After spin resolves: team card expands — flag, country name, group label, win probability badge
- CTA button: `"Go to my dashboard"` — appears after 2 seconds post-reveal

**Reel Animation (TeamReel.vue):**
- Use GSAP `gsap.to()` on a vertical list of flag images
- Phase 1 (0–2s): fast scroll, all 32 teams looping
- Phase 2 (2–4s): ease-out deceleration with `power3.out`
- Phase 3: hard-stop on assigned team, team card "pops" in with scale bounce
- The assigned team is pre-determined server-side before animation starts (pick from Firestore available pool)

**Assignment Logic:**
1. On mount, call a Firestore transaction:
   - Read `config/teams` → filter out already-assigned `teamId`s from all `users` docs
   - Pick one at random from remaining pool
   - Write `teamId` to `users/{uid}`
2. Then trigger the reel animation, ending on that team
3. Compute `winProbability` and write back to the user doc

---

### Screen 3: Dashboard (`/dashboard`)

**Purpose:** Main home for signed-in users with a team. Two tabs: Group Stage and Brackets.

**Layout:**

#### Top — UserBanner (full width)
See component spec below.

#### Tab Bar
- Two tabs: `"Group Stage"` | `"Knockout Bracket"`
- Active tab: purple underline + white text
- Inactive: grey text
- Smooth fade transition between panels

#### Tab 1 — Group Stage

- Shows all 8 groups (A–H) as cards in a responsive grid (2 cols desktop, 1 col mobile)
- Each group card:
  - Group letter header (large, purple)
  - Table: Team name | Flag | W | D | L | Pts
  - The user's team row is highlighted: purple row background, slight glow border
- Static data from `groups.json`, no live scores needed (this is a sweepstake, not a live tracker)

#### Tab 2 — Knockout Bracket

- Visual bracket tree: Round of 16 → QF → SF → Final
- Each slot shows: flag thumbnail + country name, or `"TBD"` if not yet known
- User's team slot: purple outline + glow effect
- Bracket is static structure from `groups.json` until results are entered by admin
- On mobile: horizontal scroll with fixed left labels

---

## Component Specs

### `UserBanner.vue`

Used on both `/assign` and `/dashboard`.

```
┌─────────────────────────────────────────────────────────────┐
│  [profile pic]  Pablo García          🇧🇷 Brazil             │
│  (40px circle)  pablo@worksome.com    12.4% win chance       │
└─────────────────────────────────────────────────────────────┘
```

- Background: `rgba(109, 40, 217, 0.15)` (purple-700 at 15%) with a 1px purple border
- Profile picture: Google OAuth `photoURL`, fallback to initials avatar
- Name and email: white / grey-400
- Team flag + name: shown only if `teamId` is set
- Win probability badge: small pill, gradient purple, e.g. `"12.4% chance"`
- On `/assign` before spin: only shows name/email, no team section

---

## Phase 5 — Tailwind Config & Global Styles

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          bg:     '#0D0014',
          card:   '#160020',
          purple: '#7C3AED',
          glow:   '#A855F7',
        }
      },
      boxShadow: {
        glow: '0 0 20px rgba(168, 85, 247, 0.4)',
        'glow-lg': '0 0 40px rgba(168, 85, 247, 0.6)',
      }
    }
  }
}
```

Global `index.css`:
```css
body {
  background-color: #0D0014;
  color: white;
  font-family: 'Inter', sans-serif;
}

/* Radial blob helper */
.blob {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  opacity: 0.15;
}
```

---

## Phase 6 — Pinia Store

```js
// stores/user.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)      // Firebase auth user
  const profile = ref(null)   // Firestore doc
  const team = computed(() =>
    profile.value?.teamId
      ? teams.find(t => t.id === profile.value.teamId)
      : null
  )

  function setUser(firebaseUser) { user.value = firebaseUser }
  function setProfile(doc) { profile.value = doc }

  return { user, profile, team, setUser, setProfile }
})
```

---

## Phase 7 — Build & Deploy

```bash
# Install
npm create vite@latest worldcup-sweepstake -- --template vue
cd worldcup-sweepstake
npm install firebase pinia vue-router gsap tailwindcss @tailwindcss/vite

# Dev
npm run dev

# Build
npm run build

# Deploy to Firebase Hosting
npm install -g firebase-tools
firebase login
firebase init hosting   # point to dist/
firebase deploy
```

---

## Prompting Order for Claude

Feed these prompts to Claude **in this exact order**, one phase at a time. Complete and verify each before moving to the next.

```
1. "Set up a Vite + Vue 3 project with Tailwind CSS v4, Pinia, Vue Router, and Firebase. Create the file structure as described. Add the firebase.js init file using env vars. Add the Pinia user store. Add the router with three routes and auth guards."

2. "Create the global styles: black-purple background (#0D0014), two fixed purple radial blobs, the Tailwind config with brand colors and glow shadows."

3. "Build LoginPage.vue: centered card, World Cup trophy SVG, Google Sign-In button. On click, sign in with Google popup. Check Firestore for existing user doc. Route to /assign or /dashboard accordingly."

4. "Build UserBanner.vue: shows Google profile picture, name, email, and optionally team flag + win probability. Use the Pinia user store."

5. "Build TeamReel.vue: accepts a resolved teamId prop. On mount, animates a slot-machine spin through all 32 team flags using GSAP, decelerates, and stops on the target team. Emits 'done' when complete."

6. "Build AssignPage.vue: shows UserBanner, then TeamReel. On mount, run a Firestore transaction to pick a random unassigned team from teams.json, save it to the user doc, compute win probability, then trigger the reel. After reel emits done, show team reveal card and a button to navigate to /dashboard."

7. "Build GroupTable.vue: takes a group object (name, teams array with W/D/L/Pts). Highlights the row matching the user's assigned teamId with a purple glow."

8. "Build BracketView.vue: renders a 4-round knockout bracket (R16, QF, SF, Final) as a horizontal tree. Slots show flag + name or TBD. Highlights user's team slot."

9. "Build DashboardPage.vue: UserBanner at top, two tabs (Group Stage / Knockout), tab switching with Vue Transition fade. Group Stage tab shows GroupTable for all 8 groups. Bracket tab shows BracketView."

10. "Add Firebase Hosting config, run npm run build, verify the dist output is correct, and provide the firebase deploy command."
```

---

## Notes

- **No team duplication:** The Firestore transaction in step 6 prevents two users from getting the same team. If the company has more employees than 32 teams, assign teams in rounds (e.g. track round number, allow duplicates after round 1 fills).
- **Admin panel (optional later):** A simple `/admin` route behind an email allowlist can update match results to advance the bracket.
- **Win probability:** Recalculate whenever teams are eliminated. Store eliminated teams in a `config/eliminated` Firestore doc and recompute on dashboard load.
