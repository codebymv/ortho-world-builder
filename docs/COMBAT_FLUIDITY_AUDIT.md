# Combat Fluidity Audit — Hitboxes, Timing Reliability, Range Prediction

Full-system audit of the combat stack with the goal of "souls-like intensity and fluidity"
for what already exists. Scope: player offense, player defense, enemy AI/telegraphs,
hit detection geometry, input pipeline, and feedback (hitstop/shake/knockback).

Files audited:

- `src/lib/game/Combat.ts` (enemy state machine, all incoming-hit resolution, parry/block)
- `src/game/runtime/RuntimeCombatActions.ts` (player melee, combo, targeting)
- `src/game/runtime/PlayerSimulationSystem.ts` (dodge, lunge, arc wave, movement)
- `src/game/runtime/RuntimePointerInput.ts` / `RuntimeKeyboardInput.ts` (input)
- `src/game/runtime/RuntimeEnemyLoop.ts`, `EnemyVisualSystem.ts` (telegraph presentation, feedback)
- `src/lib/game/ScreenShake.ts`, `SpatialHash.ts`, `playerCombatGeometry.ts`
- `src/data/enemies.ts`, `src/data/weaponMovesets.ts`, `src/data/balance.ts`

---

## Executive summary

The foundation is genuinely good: all combat timers are dt-based (frame-rate independent),
committed dash attacks lock a strike point at telegraph start (real souls spacing play),
poise/stagger/backstab/parry all exist, and hit-stop + screen shake are already wired.

The gap between "good 2D ARPG" and "souls-like intensity" comes from five structural issues:

1. **Player attacks deal damage instantly at the input event** — the swing animation is
   cosmetic. There is no windup, no active window, no commitment. This single fact removes
   most of the souls feel from the player's side.
2. **Light attacks fire on mouse-UP, not mouse-down** (charge disambiguation), adding the
   full click duration of latency to every swing — and there is an input-drop window in the
   combo chain where clicks are silently eaten.
3. **Hit geometry is center-point based with no body radius for enemies** — swings whiff on
   visually-overlapping large enemies; enemy melee resolves as a 360° radial with hidden
   bonus reach (×1.3) so rolling *behind* an enemy is mechanically meaningless.
4. **Defensive timing has reliability holes**: no post-hit grace vs. other enemies (pack
   double-taps), dodge inputs are consumed-and-dropped during cooldown, attack inputs are
   dropped during rolls, and block/parry are omnidirectional.
5. **Telegraph visuals desync from telegraph timers** — the randomized telegraph variance
   (`setVariableTelegraph`) changes the timer but the visual windup is normalized against
   the *base* duration, so "held" telegraphs animate with negative progress and extended
   casts show no buildup for their first third.

Fixing 1, 2 and the input drops is the bulk of "extra fluidity". Everything else is tuning.

### Scorecard

| Pillar | Grade | Verdict |
| --- | --- | --- |
| Frame-rate independence | A | All timers dt-accumulated; dt clamped; per-frame probabilities scaled by dt |
| Enemy AI design | B+ | Locked-target dashes, variance, phases, poise — strong. No pack coordination |
| Player offense feel | D | Instant hit at input event, single-target, fires on mouse-up |
| Hit geometry | C | Player hurtbox padded consistently (good); enemy bodies unpadded; 360° enemy melee |
| Input reliability | C- | Two real drop paths (combo window, dodge cooldown); no roll→attack buffer |
| Defense (dodge/block/parry) | B- | i-frame numbers are right; omnidirectional block; no multi-enemy hit grace |
| Feedback (hitstop/shake) | B | Present and tiered on offense; nearly absent when the player takes a hit |
| Code health | C+ | `Combat.ts` is a 2,548-line god file; player-hit resolution duplicated 4× |

---

## 1. How a hit actually happens today (ground truth)

### Player swing timeline

```
mousedown ──► anim 'charge', isLmbHeld=true        (no attack yet)
mouseup   ──► holdDuration < 0.4s → performAttack()
                 └─► _executeAttackStep(step)
                        ├─ damage applied HERE, synchronously (single target)
                        ├─ anim 'attack' begins (3 frames × 0.15s × frameMult ≈ 0.32–0.63s)
                        └─ recovery 0.28–0.7s + comboWindow 0.28–0.5s after anim
```

- Damage application: `_applyAttackDamage` is called directly from `_executeAttackStep`
  (`RuntimeCombatActions.ts` ~line 556) — i.e. the hit lands **before the first animation
  frame renders**. Damage numbers and hit-stop fire while the blade is still at rest.
- Targeting: `getForwardMeleeTarget` (~line 48) picks **exactly one** enemy in a 120° front
  cone (`dot ≥ 0.5` on 4-direction facing), scored by `distSq − dot×0.25`. The scythe and
  greatsword — sold as wide-arc weapons in `weaponMovesets.ts` — hit one enemy per swing.
- Range: `getEnemiesInRange(playerPos, attackRange × rangeMult)` →
  `SpatialHash.query` is **center-to-center** (`SpatialHash.ts` line 76). No enemy body
  radius. A golem rendered at `baseScale 2.8` has the same effective reach requirement as a
  slime; swings that visually overlap its body whiff.

### Enemy swing timeline (normal melee)

```
chasing ──► dist ≤ attackRange → 'telegraphing'
              telegraphTimer = variance(telegraphDuration)   ← 10% ×0.45, 15% ×1.25–1.5, 75% ×0.85–1.15
              (enemy stands still; sprite swells/shakes)
telegraphTimer ≤ 0 ──► single-instant resolution at LIVE player position:
              hit if distSq ≤ (attackRange × 1.3 + 0.4)²     ← hidden ×1.69 sq mult + player pad
              + melee LoS / elevation trace
          ──► 'recovering' (0.4–1.3s; takes ×1.5 damage)
```

- Resolution is **omnidirectional** — `Combat.ts` ~line 1750 only checks distance, never the
  enemy's facing. Rolling through/behind an attack only works via i-frames, never spacing.
- The effective reach (e.g. wolf: 1.5 × 1.3 + 0.4 ≈ **2.35 tiles**) is ~57% larger than the
  range that *triggered* the attack, and nothing communicates it visually.
- AoE/special attacks consistently pad by `PLAYER_HIT_RADIUS` via `paddedPlayerHitSq` —
  this side of the geometry is clean and centralized. Good prior work.

### Defense numbers (for reference)

| System | Value | Source |
| --- | --- | --- |
| Dodge duration / i-frames | 0.25s / 0.22s (starts frame 0; ~30ms vulnerable tail at roll end, then hard-zeroed) | `GameState.ts` 308, `setupGameRuntime.ts` 463, `PlayerSimulationSystem.ts` 761–763 |
| Dodge distance / cooldown / stamina | ~1.8 tiles / 600ms / 26 | `dodgeSpeed 0.12×60`, `dodgeCooldown`, `dodgeStaminaCost` |
| Parry window | 0.25s from block *press* | `PARRY_WINDOW`, `Combat.ts` 16 |
| Block | 60% reduction, stamina −dmg×0.8, guard break 1.2s | `Combat.ts` 15, 2190 |
| Post-hit i-frames | AoE/specials: 0.35–0.4s. **Normal melee: none** | `Combat.ts` 2160 vs 2202 |
| Attack stamina / cooldown | 20 / 500ms | `setupGameRuntime.ts` 446, `GameState.ts` 301 |
| Stamina pool / regen | 120, 44/s after 0.38s | `GameState.ts` 313–316 |

---

## 2. P0 — Reliability bugs (fix first; these read as "the game ate my input")

### P0.1 — Combo-window clicks are silently dropped

`RuntimePointerInput.ts` ~line 129: a mousedown while `comboWindowTimer > 0` sets
`isLmbHeld` and returns — it never sets `isChargingAttack`. On mouseup (~line 192),
`performAttack()` only runs inside `if (getIsChargingAttack())`, which is false → **the
click does nothing**.

The window where this happens is `[animEnd, attackCooldown]` after a swing starts. For the
default sword that's ~`[450ms, 500ms]` (50ms dead zone); for fast weapons / later combo
steps (anim as short as ~315ms) it widens to **~185ms** — exactly where a rhythm player
clicks to chain. This is almost certainly the source of any "combos feel inconsistent"
impression.

**Fix**: in the mouseup handler, if `isLmbHeld` was set via the combo-window path, call
`performAttack()` unconditionally (or better — see P1.2, fire on mousedown).

### P0.2 — Dodge presses are consumed-and-dropped

`Space` sets `dodgeBuffered = true` (`RuntimeKeyboardInput.ts` 243). The sim consumes it
next frame and calls `performDodge`, which **silently no-ops** if within the 600ms cooldown
or out of stamina (`RuntimePlayerActions.ts` 38–40) — and the buffer is cleared regardless
(`PlayerSimulationSystem.ts` 670–673). Pressing dodge 50ms before cooldown expiry = dropped
input. Souls buffers this.

**Fix**: keep `dodgeBuffered` alive with a short TTL (~150–200ms) and retry each frame until
it succeeds or expires, instead of clear-on-first-attempt.

### P0.3 — Attack inputs ignored during dodge (no roll → attack buffer)

`handleMouseDown` early-outs on `state.player.isDodging` (`RuntimePointerInput.ts` 115).
There is no buffer, so attacking out of a roll requires a frame-perfect click after the
0.25s roll ends. Souls buffers R1 during the roll and fires it on recovery — that buffer is
a large share of why souls combat feels "chained".

**Fix**: during dodge, set a `pendingAttackBuffered` flag (TTL ≈ roll remainder + 150ms) and
fire `performAttack()` on the first frame `isDodging` clears.

### P0.4 — Telegraph visuals desync from actual telegraph timers

`setVariableTelegraph` (`Combat.ts` 337) sets `telegraphTimer` to 0.45×–1.5× of
`telegraphDuration` (and crusher ×1.5, bladestorm ×1.35 *on top*), but
`EnemyVisualSystem.ts` ~368/379 computes:

```ts
const telegraphProgress = 1 - enemy.telegraphTimer / enemy.telegraphDuration;
```

For "held" variants progress starts **negative** (the windup sprite shrinks/sits inert and
then snaps), and a crusher at 1.5–2.25× shows no buildup for the first third-to-half of its
real windup. The player is being asked to read timing from a visual that lies about it.
Same bug in the `chargeFrame` computation (~line 168).

**Fix**: store the rolled total (`enemy.telegraphTotal = enemy.telegraphTimer`) whenever the
timer is assigned, and normalize all visuals against that.

### P0.5 — No cross-enemy hit grace (pack double-taps)

`attackPlayer` (`Combat.ts` 2170) sets `damageFlashTimer`/`hurtTimer` but **no
`iFrameTimer`** — unlike every AoE/special path (0.35–0.4s). Two wolves whose telegraphs
expire on the same frame deal full double damage with one reaction opportunity. With trash
at 13–18 damage and the 5–7-hits-to-kill target in `balance.ts`, one pack moment can take
~36% HP with zero counterplay.

**Fix**: grant ~0.3s `iFrameTimer` (or a separate `hitGraceTimer` that only gates *other*
enemies, if you want chip pressure from the same enemy's chain attacks to stay legal) in
`attackPlayer`, matching the AoE paths.

---

## 3. P1 — Structural souls-feel changes

### P1.1 — Move damage off the input event onto a strike frame (biggest single win)

Currently: input → damage → animation. Souls: input → windup (committed) → **active
frames** → recovery. Concretely:

- In `_executeAttackStep`, don't call `_applyAttackDamage(step)` synchronously. Schedule a
  per-swing `strikeTimer = frameDuration × 1.0` (hit lands on anim frame 1→2 boundary, i.e.
  ~130–210ms depending on weapon) and resolve it in `PlayerSimulationSystem` when it
  expires — same place the attack anim timers already tick.
- Resolve the target **at strike time**, not press time (enemies that walked/were knocked
  out of the cone correctly whiff; enemies that stepped in get clipped).
- Heavy weapons get their identity for free: greatsword `frameMult 1.4` → ~210ms windup,
  dagger-class ~95ms — commitment scales with weapon weight without new data.
- Dodge-cancel rules then become meaningful (see P1.4).

This also fixes the cosmetic absurdity of damage numbers/hit-stop firing before the blade
moves, and makes the existing `hurtTimer` interrupt (being hit cancels your swing) actually
able to interrupt a swing *before* its damage lands — true trade windows.

Related detail: the attack animation already has **visual-only root motion**
(`RuntimePlayerFrame.ts` ~152 — sprite lunges 0.15–0.24 tiles forward on the strike frame)
but the hit origin never moves. Once damage resolves at strike time, resolve it from the
visually-lunged position (player pos + the same offset) so the blade hits where it appears.

### P1.2 — Fire light attack on mousedown; promote to charge by hold

`RuntimePointerInput.ts` defers every light attack to mouseup to disambiguate from charge
(threshold 0.4s). That's +60–150ms latency on the most-used input in the game — and every
quick tap visibly flashes the `'charge'` windup pose before the swing resolves on release,
which reads as sluggishness even when the timing is fine.

Recommended model (Hades/DS hybrid), which becomes natural once P1.1 exists:

- **mousedown** → `performAttack()` immediately (starts windup).
- If the button is **still held** when the swing's active frames end and hold ≥ 0.4s, flow
  into the charge state (the swing becomes the charge windup) — release then fires the
  lunge/arc at the current `chargeLevel`.
- Mid-swing presses keep the existing `comboInputBuffered` path (it's good).

This kills the P0.1 dead zone too, since mousedown always does something.

### P1.3 — Give melee hit tests body radii and arcs

- **Player → enemy**: pad reach per enemy: `reach = stepRange + enemyBodyRadius(type)`,
  with radius derived from the existing `ENEMY_VISUALS.baseScale` table (e.g.
  `0.35 × baseScale`). Resolve in `_applyAttackDamage` (the SpatialHash query just needs
  `stepRange + maxBodyRadius` then a per-enemy padded check). This makes hits on golems/
  bosses connect when they visually should — the exact symmetry `paddedPlayerHitSq` already
  established for the other direction.
- **Multi-hit for wide weapons**: add `hitArc: 'single' | 'cleave'` (or `maxTargets`) to
  `ComboStepDef`. Scythe/greatsword/broadsword steps hit *all* cone targets (scythe with its
  existing 0.3 poiseMult idea to avoid CC-locking crowds); swords stay single-target with
  the current best-score pick.
- **Enemy → player front arc**: in the normal-melee resolution (`Combat.ts` ~1750), require
  `dot(enemyFacing, toPlayer) ≥ -0.2` (~220° front arc, forgiving). Rolling *through* an
  attack to its back becomes a real spacing answer, not just an i-frame answer. Keep AoEs
  (stomp/nova/crusher) radial — that's their identity.
- **Telegraph honesty**: either drop the hidden ×1.3 resolve-range multiplier toward ×1.15
  and lock the strike origin at telegraph start for normal attacks too, or keep it and add a
  brief ground-reach cue for the big hitters. Hidden reach is the main "that hit was BS"
  generator. (`rangeMult 1.69/3.0`, `Combat.ts` 1476.)

### P1.4 — Commitment rules: when can a roll cancel a swing?

Today `performDodge` has no anim-state gate and damage is instant, so attack→roll is free.
Once P1.1 lands, pick a rule and enforce it in the `dodgeBuffered` consumption gate
(`PlayerSimulationSystem.ts` 670):

- **Recommended**: windup is *not* cancellable (you committed; the strike will happen),
  recovery *is* dodge-cancellable (already true via `attackRecoveryTimer = 0` on dodge —
  keep that, it feels great). This is the Dark Souls contract and gives enemies' punish
  windows teeth.
- Lenient alternative: cancelling during windup is allowed but forfeits the hit and refunds
  no stamina.

### P1.5 — Directional block

`attackPlayer` / `applyAreaHitToPlayer` never check the player's facing — blocks (and
parries) work with your back turned. Add a frontal requirement
(`dot(playerFacing, toEnemy) > 0`, i.e. 180°) for melee and projectiles; let hazards/AoEs
stay omnidirectional. Positioning while blocking instantly matters, and turning to face the
right wolf in a pack becomes gameplay. (Also dedupe: the `0.25` parry-shimmer literal in
`RuntimePointerInput.ts` 167 should import `PARRY_WINDOW`.)

### P1.6 — Pack coordination (attack tokens)

Every enemy in range telegraphs independently — three wolves can stack three overlapping
telegraphs with omnidirectional resolution (and, pre-P0.5, no hit grace). Souls games gate
this with attack tokens. Cheap version: a per-frame counter in `updateEnemies` — before
entering `telegraphing`, count enemies already in `telegraphing/attacking` targeting the
player within ~6 tiles; if ≥ 2, keep chasing (big/boss types exempt). ~15 lines, transforms
group fights from damage-races into rotations.

---

## 4. P2 — Feel & polish

| Item | Current | Recommendation |
| --- | --- | --- |
| Player-takes-hit shake | `shake(0.18, 0.12)` re-triggered **every frame** while `damageFlashTimer > 0` (`RuntimePlayerFrame.ts` 447–448) — a flat ~0.4s buzz whose decay never progresses | trigger once at the moment of damage with a stronger kick (e.g. 0.3, 0.15) and let it decay; add a small knockback nudge (~1.5 impulse) on normal melee |
| Blocked-hit feedback | successful block connect has **no** SFX/shake/spark — only the RMB-down `playBlock()` and the guard-break sound | per-connect block clank + tiny shake (0.1, 0.06) + spark at the contact point; sells the 60% reduction |
| Projectile block chip | blocked projectiles deal **zero** health chip (`applyProjectileHit` returns early) vs 40% chip for melee | inconsistent — pick one rule (suggest: same 40% chip) |
| Hitstop tiering | flat 0.07s normal / 0.13s finisher | scale by weapon class: dagger 0.04 → greatsword 0.10 base; +0.03 on finisher; keep crits as-is |
| Whiff vs hit audio | same `playSwordSwing` always | layered whiff whoosh when no target connects (cheap, big readability) |
| Stagger burst | poise break → 1.4×/2.0× damage state | brief 0.06s hitstop + distinct sound on the poise *break* itself so the punish window is announced |
| Enemy `attackCooldown` / `lastAttackTime` | set at spawn (`Combat.ts` 823–824), never read | dead fields — delete or use them as the pack-token cooldown |
| Block whiff cost | parry window opens on every block press, no miss penalty | optional: 0.3s no-parry lockout after a whiffed parry window to make parry a read, not a mash |
| Unused stagger/backstab labels | `STAGGER!` / `BACKSTAB!` floating-text sprites are pre-rendered in `FloatingText.ts` (~97) but never spawned | free polish: spawn them on poise break / backstab |
| Dodge vs charge overlap | dodging doesn't clear `isChargingAttack`; LMB-held charge keeps ticking through a roll | clear or pause the charge state on dodge start |
| Wall-clock timers | `lastAttackTime`/`lastDodgeTime` use `performance.now()` — cooldowns tick during pause/hit-stop | migrate to accumulated game-time (you already pass `currentTime` everywhere); low urgency |

---

## 5. Code health notes (worth doing alongside)

1. **Player-hit resolution is duplicated 4×** in `Combat.ts`: `attackPlayer`,
   `applyAreaHitToPlayer`, the inlined sentinel-slab block (~1546), and
   `applyProjectileHit`. They have already drifted (guard-break deals 0 damage in
   `attackPlayer` line 2197 but reduced damage in `applyAreaHitToPlayer`; slab rolls its own
   copy of everything). Extract one `resolveIncomingPlayerHit(damage, source, opts)` before
   adding directional block / hit grace, or those will be implemented inconsistently too.
2. `Combat.ts` (2,548 lines) mixes the enemy state machine, per-boss scripting, projectiles,
   hazards, and player-hit math. Minimum useful split: `EnemyStateMachine.ts`,
   `BossAttacks.ts` (the telegraph-end attack-type ladder), `IncomingHit.ts`,
   `Projectiles.ts`. This mirrors the god-file findings in the cross-project tech-debt
   audit.
3. Telegraph variance, dash speeds, attack-type rosters (`pickBigEnemyAttackType`) are
   hardcoded per-type in `Combat.ts` — they belong next to the rest of the per-enemy data
   in `enemies.ts` as blueprint fields, which also makes P0.4's `telegraphTotal` trivial.
4. **Damage-display drift**: `Combat.playerAttack` computes and applies the real final
   damage, then `_applyAttackDamage` *re-derives* a display number from post-hit state for
   the floating text (`RuntimeCombatActions.ts` 499–504) — and its crit check reads
   `target.state` *after* the hit may have caused the stagger. Have `playerAttack` return
   the applied damage and display that.
5. Hit feedback (shake/hitstop/particles/floating text) is re-implemented with slightly
   different constants in four places: `_applyAttackDamage`, the charge-spin loop,
   `onLungeHit`, and `onArcWaveHit` (`setupGameRuntime.ts` ~1085–1125; arc wave omits
   hitstop entirely). One `emitHitFeedback(target, tier)` helper keeps weapon-feel tuning
   in one place.

---

## 6. Suggested implementation order

| Pass | Work | Effort | Player-visible result |
| --- | --- | --- | --- |
| 1 | P0.1 combo-window drop + P0.2 dodge buffer TTL + P0.3 roll→attack buffer | S | inputs never feel eaten |
| 2 | P0.4 telegraph normalization + P0.5 hit grace | S | enemy windups readable; packs fair |
| 3 | P1.1 strike-frame damage (+ P1.4 commitment rule) | M | swings have weight; trades exist |
| 4 | P1.2 attack-on-mousedown + charge promotion | M | snappiest the game will ever feel |
| 5 | P1.3 body radii + cleave arcs + enemy front-arc | M | hits land where eyes say; roll-behind works |
| 6 | P1.5 directional block + parry dedupe | S | positioning matters while guarding |
| 7 | P1.6 attack tokens + P2 polish batch | S–M | pack fights read souls, not swarm |

Passes 1–2 are pure fixes with no design risk and could ship immediately. Pass 3 changes
game balance (player DPS timing) — retune `telegraphDuration`/`recoverDuration` for trash
afterward (they were tuned against a zero-latency player attack).
