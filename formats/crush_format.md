# Crush Shorts (Craftee): Format Reference, measured from the audio

> Theme file. Read **CLAUDE.md first** (general rules: §2 pacing, §3 ingredients, §4 writing style, §4b story logic, §15 titles), then this file. Where they differ, this file wins for this theme: crush is ~35 s at ~5.3 w/s, not ~4 w/s.

Four Craftee shorts in `references/crush/`: **controls weather, meteor, shrink, sleep over secret**.
**Also:** three text transcripts from other sources, **cute coins, line up, twin** (`.txt` in the same folder). They bring two new templates, **G Absurd Line** and **H Snowball Lie**, and a twist variant of F (**F2 Rule Betrays Her**). See §8b; transcripts in §7.
The visuals are the same across all four, so this is about the **audio and the script**: hook, beats, pacing, voice, music and SFX.

**How it was measured:** faster-whisper `small.en` for word timings, librosa for pitch (pyin) and loudness, ffmpeg `ebur128` for LUFS.
The music was isolated by taking the minimum spectrum across all four files, which works because all four share the exact same music track (see §5).
Transcripts are in `formats/crush_transcripts.md`.

---

## 0. Headline numbers

| | Controls Weather | Meteor | Shrink | Sleep Over Secret |
|---|---|---|---|---|
| Length | 36.2 s | 37.5 s | 33.9 s | 35.2 s |
| Words | 192 | 195 | 188 | 188 |
| **Words / second** | **5.3** | **5.2** | **5.5** | **5.3** |
| Sentences / mean words per sentence | 30 / 6.4 | 32 / 6.1 | 23 / 8.2 | 25 / 7.5 |
| First word starts at | 0.00 s | 0.00 s | 0.00 s | 0.00 s |
| Silence after the last word | 0.03 s | 0.26 s | 0.27 s | 0.37 s |
| Gap between sentences (median / longest) | 0.14 / 0.36 s | 0.12 / 0.24 s | 0.14 / 0.28 s | 0.14 / 0.26 s |
| Narrator median pitch / movement | 224 Hz / 3.8 st | 204 Hz / 4.7 st | 204 Hz / 4.1 st | 202 Hz / 3.7 st |
| Loudness | −14.1 LUFS, LRA 1.1 | −14.1 LUFS, LRA 2.0 | −14.1 LUFS, LRA 1.4 | −14.1 LUFS, LRA 1.0 |

**What's different from the long Craftee videos (CLAUDE.md §2):**
- **Length is ~35 s, not 100–160 s.** It's one joke-shaped story, about 190 words.
- **The narration is much faster: 5.2–5.5 words/s**, against 3.7–4.2 in the long Craftee reels and 4.1–4.7 in everything else we've measured. This is the fastest narration in the reference set.
- **The gaps are tiny:** 0.12–0.14 s between sentences, and no gap inside a phrase at all. Only one gap in all four videos passes 0.3 s.
- **The newer transcripts fit the same budget:** Cute Coins 188 words / 36.0 s = 5.2 w/s, Twin 196 / 35.7 s = 5.5 w/s (lengths from the mp4s), Line Up 192 words (no video, so ~36 s at 5.3).
- **Script budget:** ~**5.3 words per second**, so ~160 words for 30 s, ~190 for 35 s, ~210 for 40 s.
- **Our house voice is slower (measured on Crush Gravity):** ElevenLabs v4 Turbo Adam at 1.5x reads ~3.9 w/s, so 188 words = 48.6 s. For a true ~36 s crush short write **~140 words**; at ~190 words expect ~48 s.
- **Longer is fine: a crush video may run anywhere up to ~90 s** (~350 words in our voice). Keep the beat shape; add ladder rungs, clues or a second crowd beat rather than slower lines.

---

## 1. The beat sheet (same shape in all four)

| Beat | Time | What happens | Examples |
|---|---|---|---|
| **1. Hook = premise in one line** | 0–2 s | The crush and the impossible thing, in the first sentence. No intro, no title, the first word is at frame 0. | "My crush controls the weather. She has no idea." / "In my town, every time you lie, you shrink." / "I told my crush I loved her because the world was ending. It didn't." / "The girl who hates me most is living at my house for a week." |
| **2. Rule + stakes** | 2–6 s | One or two lines that set the rule and what's at risk. | "When she's sad, the whole city floods. So the mayor hired me to keep her happy. He had one rule: she can never find out." / "If anyone at school finds out, she'll end me." |
| **3. Sweet spot** (F only; G and H skip it) | 6–18 s | Things go well for a moment. It ends with a **"Best ___ of my life" line**, then **"Then…"** breaks it. | "Best job I ever had." (10 s) / "Best hour of my life." (9 s) / "Best night of my life. Then she remembered she hates me." (17 s) |
| **4. The mistake** | 11–15 s | The narrator does something small and dumb. The crush reacts in silence. | "Then the new girl sat next to me at lunch. My crush saw. She didn't say a word." |
| **5. Escalation ladder** | 14–27 s | **Three tries, same sentence shape, each one worse.** This is the comedy engine. | "I said sorry. Lightning hit my bike. I bought her flowers. Lightning hit the flowers. I told her the new girl means nothing… The roof came off the gym." / Lie → shrink ×4, ending "That one cost me half my height." / "I failed every class. My dad sold my bed. I got stuffed in a locker twice." |
| **6. Public pressure** | throughout, peaks ~25 s | There's always a crowd watching: the whole town, the class, the cafeteria. | "The whole town was screaming at me." / "The whole class leaned in." / "Everyone turned around." |
| **7. The turn: she likes him too** | 27–33 s | The crush answers **using the same mechanic** as the premise. That's the twist. | She lies and shrinks too ("Good, because I don't like you either.") / She fakes an asteroid to get him back ("There's another asteroid!") / Her mom set up the sleepover ("So, did it work?") / The storm stops when he confesses. |
| **8. Kicker** | last 2–4 s | One short line, then the video ends. It's either a shouted one-word line or a dry new rule. No call to action, no outro. | "Mom!" / "I know!" / "New rule: you can never break up with her." / "Neither of us wants to say it first." |

**The rules that make it work:**
- **The premise is a magic rule that turns feelings into something everyone can see**: weather, shrinking, the end of the world. A crush is private, and the rule makes it public. Every joke comes from that.
- **The crush is never cruel to him, only embarrassed or cold.** The narrator is the fool. She "goes bright red" in 2 of the 4 endings. In the newer ones she can be the **cold, unreadable girl** ("the coldest girl in school", "She didn't look up"); her coldness is the setup the ending cracks.
- **The twist reuses the premise.** The girl fights back with the same tool, so the ending feels earned in a 35 s story with no time for new information.
- **One plant, one payoff.** "Her dad at the grocery store… must be his twin" (5 s) pays off as "Her dad got out of the car in his house slippers" (30 s). "He had one rule" (5 s) pays off as "New rule" (35 s).
- **No villain, no danger, no explanation.** Adults show up only for a punchline ("Sorry, everyone. Our bad." / "So, did it work?").

---

## 2. Writing style

- **Short sentences, usually 4–7 words.** 30 sentences in 36 s for Weather. The longest sentence in each video is a list or a two-part setup ("At lunch, she fixed my collar in front of the whole cafeteria, then punched my arm so it looked normal.").
- **Cause, then effect, as two sentences:** "I bought her flowers. / Lightning hit the flowers." The effect line repeats a word from the cause line. That repetition is the joke.
- **The contradiction line:** a lie, then the fact that breaks it, with no comment. "I said I was looking at the clock. / The clock is behind me." "I said it was my dog's name. / I don't have a dog."
- **Fragments for emphasis:** "Out loud." "Our bad." "Fix it!"
- **Time jumps in one phrase:** "On my first day", "30 seconds later", "With ten minutes left", "A few lies later", "On Friday", "Then one night". Each one opens a new beat.
- **Numbers make the jokes specific:** "three days", "one hour", "two years", "half my height", "two inches tall", "stuffed in a locker twice".
- **Dialogue is very short, and the crush gets the last word** in 3 of 4 (and in Coins and Line Up).
- **Refrains and tags (newer transcripts):** a sound word that counts the feeling and grows ("Clink." → "Clink, clink." → "Clink, clink, clink."), a one-word tag after every blunder ("I fell down the stairs, Gary."), and a rejection refrain ("No. Next."). Each one is repeated 3+ times, then broken on the turn.
- **Absurd time-skip in threes:** "The line got its own mayor. Two guys opened a sandwich shop. The guy behind me grew a beard." Sells a long wait in 4 s.

---

## 3. Pacing: fast set-up, slow reveal

Average speed is 5.3 w/s, but it isn't flat. Measured per sentence:

- **Throwaway set-up lines run 7–9 w/s:** "So the mayor hired me to keep her happy" (7.4), "I said I was looking at the clock" (9.1), "Her parents went on a trip" (7.9).
- **Reveal and reaction lines drop to 3.5–4.5 w/s:** "Everyone screamed, and the asteroid missed" (3.5), "There's another asteroid!" (3.8), "The whole class leaned in" (4.0), "The storm stopped instantly" (4.3), "Everyone turned around" (4.5).
- So **the voice slows down for the 2–3 lines the story turns on, not by adding pauses but by stretching the words.** The gap before them stays at ~0.15 s.
- The only real pause (0.36 s) is in Weather, right before "Lightning hit my bike", and it's where a low thump sits (§6). **A beat of silence is used once, for the biggest hit.**
- A new beat arrives every **3–5 s**. That's about twice as often as the long Craftee reels (5–10 s).

---

## 4. Voice and delivery

- **One narrator, first person, young male-sounding voice, around 200–225 Hz median with 3.7–4.7 semitones of movement.** That matches the long Craftee reels (188–216 Hz, 4–6 st, `reference_analysis.md` §12), so it's very likely the same voice, just driven faster.
- **The tone is deadpan.** The narrator states disasters flatly, like it's normal ("Lightning hit the flowers."). The comedy comes from that flatness against the content.
- **Most dialogue is read in the narrator's voice**, quietly (for example "So you talked to girls who mean nothing?", "So, did it work?").
- **The shouted lines jump up: 330–450 Hz, about 8–10 semitones above the narration, and 2–4 dB louder.** Examples: "Fix it!" (425 Hz), "I love you, too." (329), "There's another asteroid!" (363), "I know!" (383), "Mom!" (453). Their timbre also measures differently from the narration. **I couldn't tell from the numbers alone whether that's a second voice or the narrator pitched up for the character, so listen to confirm.** Either way, the rule is: **characters' shouted lines are higher and louder, and they land on the turn and the kicker.**
- **The mix is very compressed:** −14.1 LUFS on all four, with a loudness range of only 1–2 LU. The voice sits at almost the same level the whole time.

---

## 5. Music

- **All four videos use the exact same music track, starting at 0.00 s in every one.** The low end of the four files matches with a 0.99 correlation at zero offset. The editor drops the same bed under every crush short and doesn't edit it to the story.
- **What it sounds like (from the spectrum):** a light, steady loop. Sustained bass notes change every couple of bars (centred on B / A♯ / C), with soft pads and keys on top. There are no hard drums. There's a hit on the downbeat at 0 s, then it just rolls. The tempo estimate is ~117 BPM (low confidence).
- **Level: about 11 dB under the voice** (music around −29 dB RMS against a −17.6 dB mix). It stays level all the way through, with no swells, drops or stingers on the twist.
- **It ends when the voice ends.** There's no outro or fade. The file stops 0.03–0.37 s after the last word.

**For us:** pick one light, upbeat, drumless loop for the whole crush series, start it at frame 0 with a downbeat, keep it ~11 dB under the voice, and cut it with the last word.

**Our crush track: `threejs/music/Caretaker - A4 - Childishly fresh eyes.mp3`.** Every crush video uses it by default:
put `{ "format": "crush" }` in `threejs/videos/<video>/music.json` (Mind Reader has it). It plays from 0 s at volume 0.3, which is the same
level the user picked for the TEMPOREX bed (about 4–5 dB under the voice, louder than the references' ~11 dB; the user found quieter beds too quiet).
Add `"volume"` or `"start"` in the same music.json to change it for one video, or `"track"` to use another song.

---

## 6. Sound effects

- **Almost none.** I checked each file for non-speech hits in the low end after removing the shared music. Only one shows up across all four videos: **a low thump at 19.6 s in Weather, on "Lightning hit my bike"**, right after the only 0.36 s pause.
- There's no thunder bed under the storm, no whoosh on the shrink, and no asteroid rumble. **The narration does the sound design.**
- **For us:** don't add a busy SFX layer. At most, one hit on the biggest physical gag.

---

## 7. Transcripts
In **`formats/crush_transcripts.md`** (all seven: Weather, Meteor, Shrink, Sleep Over Secret, Cute Coins, Line Up, Twin). Read only when choosing or studying a template; the beat tables here are enough to write a script.

---

## 7b. Visual defaults for crush videos
- **The crush is `black_shirt_girl`** by default.
- Her faces: `girl_slight_smile` (default, flirty, listening) and `girl_little_laugh` (giggling, laughing). Never the monster grins.
- **More faces for her, by beat:**
  | Face | Use it for |
  |---|---|
  | `neutral_droopy_eyes_girl` | Bored, unimpressed, deadpan: the "crush says nothing" beat after the narrator's dumb mistake, a flat stare at a bad line. black_dress_girl's own face. |
  | `girl_blushing_closed_mouth` | Shy, flustered, caught: the moment the rule exposes her feelings, she hears a compliment, the "she likes him too" reveal. |
  | `girl_grinning_face` | Smug, teasing, "I knew it": she catches him staring, reads his secret, or wins the joke (a sly half-lidded smile, not an open grin). |
  | `embarrassed_laugh` | Big awkward laugh: laughing it off, laughing at the narrator's blunder, the comedy kicker. |
  | `tsundere_hmph_girl` | Pouty denial ("It's not like I like you"), annoyed but secretly pleased, arms-crossed beats, the turn just before she admits it. |
  A good run for one exchange: grinning (she teases) → blushing (it backfires) → tsundere (she denies it) → little_laugh (she gives in).
- **`black_dress_girl`** (black ushanka with a cross, long black hair, black dress) is a second crush / rival / cool-girl option; she starts on `neutral_droopy_eyes_girl`.
- Keep the camera a bit back: two-shots of narrator + crush, close-ups at head-and-shoulders, never face-filling.
- Example: `threejs/videos/mind_reader/` (classroom, thought bubbles, mind-link sparkles).

## 8. Template F — Crush Rule (checklist for a new one)

1. **Title:** "Crush ___" / "My crush ___". Premise in 2–4 words.
2. **Line 1 (0–2 s):** the crush plus a magic rule that makes feelings visible or public.
3. **Lines 2–4 (2–6 s):** the stakes, and one rule or secret that must hold.
4. **Sweet spot (6–15 s)** ending on "Best ___ of my life." then "Then…".
5. **A small, dumb mistake**, and the crush says nothing.
6. **Three escalating tries**, in identical sentence shapes, each with a bigger visible consequence, and a crowd watching.
7. **The turn (last ~8 s):** she answers with the same mechanic and reveals she likes him too.
8. **Kicker:** one shouted word or a dry new rule. Stop.
9. **About 190 words for 35 s.** Voice at ~5.3 w/s, deadpan, with shouted character lines higher and louder. One music loop from frame 0, ~11 dB under. One SFX hit at most.

Premise ideas in the same engine (untested): her mood changes the gravity at school; every time I think about her, my hair changes colour; she can hear thoughts but only mine; the school's lie detector goes off when I say hi.

---

## 8b. New formats from the newer transcripts

All three keep the crush basics: ~190 words / ~36 s, hook at frame 0, deadpan narrator, a crowd or institution watching, she likes him in the end, a one-line kicker and stop. What's new:

### F2 — Rule Betrays Her (variant of F; Cute Coins)
Same magic rule as F, but the rule exposes **her**, not him, and the twist is **her words against the rule**.
| Beat | Time | Cute Coins |
|---|---|---|
| Hook = world rule + who it favours | 0–5 s | "Every time someone thinks you're cute, a gold coin falls on your head. The popular kids are millionaires. They have to wear helmets." |
| The narrator's zero | 5–8 s | "I've never gotten one. My own mother has never given me one." |
| Alone with the cold crush, first proof | 8–14 s | "Clink, a coin, my first coin ever… There was nobody else there." |
| Counter ladder: each small act, more coins, she never looks up | 14–26 s | "I fixed my hair, clink, clink." → raining gold → up to my knees → chest → windows burst. "She turned the page." |
| The direct question | 26–32 s | "Do you think I'm cute?" She finally looks up. |
| Kicker: her denial + the rule's answer | last 2 s | "No." / "The roof caved in." |
- **No sweet spot, no mistake.** One runaway escalation replaces the three tries; the feeling meter (coins) is the comedy, her stillness is the counterpoint.
- **The kicker is the contradiction line from §2 at story scale:** she says one thing, the rule shows the opposite, no comment. She likes him; she just won't say it. Pairs with `tsundere_hmph_girl` / `neutral_droopy_eyes_girl`.
- **Tsundere version (Crush Gravity):** she never admits it, not even at the end. Every line she says is cold ("That's so dumb." / "Not funny." / "Go away.") and each one comes with a bigger rule effect. An adult plants the key early ("Never watch her face. Watch the ceiling.") and the narrator repeats it word for word before the direct question. Her answer is a flat denial ("No! It's not like I like you or anything."), the rule answers for her, and she gets the last word ("Hmph."). Faces: `tsundere_hmph_girl` on every cold line, `girl_blushing_closed_mouth` on the rule effect right after, arms crossed.

### G — Absurd Line (new; Line Up). No magic rule.
The impossible thing is **an exaggerated social situation**, not a power: everyone wants her, and it's run like a bureaucracy.
| Beat | Time | Line Up |
|---|---|---|
| Hook = huge number | 0–4 s | "The line to confess to my crush is four miles long. I'm number four thousand and twelve." |
| The system + rejection refrain ×2 | 4–12 s | Ticket machine, "Now serving number nine." / "No. Next." + trapdoor lever. |
| Absurd time skip in threes | 12–18 s | "I waited three years. The line got its own mayor…" |
| His turn, maximum stakes | 18–24 s | "The whole line went silent. I stood on the trapdoor. Her hand was on the lever." |
| The realisation: see her as a person | 24–30 s | "She looked exhausted. Four thousand speeches and nobody had ever asked her anything." |
| He breaks the pattern | 30–33 s | Puts the speech away: "Did you eat today?" |
| Kicker: her verdict in the system's language | last 2 s | "The line is closed." |
- **The win comes from doing the opposite of everyone else** (kindness instead of a speech), not from a mechanic. Plant it: the refrain shows what everyone does, the exhausted face is the one clue (§4b.8 anomaly line).
- **The kicker reuses the setting's own words** ("Now serving", "Next", "The line") with a new meaning (§4 callback kicker).

### H — Snowball Lie (new; Twin). No magic rule.
**One panicked lie grows until it runs his life**, told from a flash-forward.
| Beat | Time | Twin |
|---|---|---|
| Hook = flash-forward contradiction | 0–3 s | "I don't have a twin. That's what I said at my twin's wedding." |
| The plant + the lie | 3–7 s | Walks into a glass door in front of her. "That was my twin brother, Gary." |
| Tag-word ladder ×3 | 7–13 s | "I fell down the stairs, Gary. I called the teacher Mom, Gary…" |
| The lie backfires | 13–20 s | "Is Gary single?" He dates her as Gary (glasses). "I was jealous of myself." |
| A plan to escape makes it worse | 20–26 s | Proposes to scare her off. "She said yes." Groom and best man. |
| The reveal re-reads the plant | 26–33 s | Vows: "you walked into a glass door. I've liked you ever since." "The door was me." |
| Kicker: cliffhanger cut | last 2 s | "If anyone objects, speak now." …"and said" (cuts mid-sentence). |
- **The hook is the ending, so the story is "how did I get here".** The plant (glass door) is the very first event and the twist line, which is §4b.1 done right: every Gary blunder was really him, and she knew.
- **New ending type: the cliffhanger cut.** The last sentence stops before the answer. Use it only when the viewer already knows what he'll say. It works for a Part 2 hook (CLAUDE.md §15).

### Which template?
| Premise has… | Use |
|---|---|
| A magic rule, he's exposed | F |
| A magic rule, she's exposed and denies it | F2 |
| No magic, an absurd crowd/system around her | G |
| No magic, his own lie or disguise gets out of hand | H |

More premise ideas (untested): G: her locker has a suggestion box, 900 notes a day / the school holds an election for who sits next to her. H: I said I was a foreign exchange student / I pretended to be my own lawyer. F2: her ears glow when she lies / flowers grow wherever she looks at someone she likes.
