# Drinking-game app research and original challenge bank

Last researched: 22 October 2026

## Scope and source policy

This catalogue studies the public feature descriptions of successful drinking-game and party-game apps, then turns the recurring mechanics into original TipsyTraveller prompts. It does **not** copy paid decks, bypass subscriptions, reverse-engineer app packages, or reproduce proprietary card libraries. That keeps the game bank useful, attributable, and safe to ship.

The recurring patterns worth borrowing are:

- instant pass-and-play setup with player names;
- short named-player actions mixed with whole-group cards;
- truth, dare, vote, category, memory, improv, and timed rounds;
- temporary rules that remain active across later turns;
- player choice between a challenge and a small penalty;
- custom cards and group-specific inside jokes;
- a skip control, sober alternatives, and no mandatory alcohol.

## Public app sources reviewed

| App | Publicly described mechanics used as inspiration | Source |
|---|---|---|
| Picolo | Named players, group and individual instructions, questions, dares, persistent rules, simple pass-and-play flow | [Official site](https://www.picoloapp.com/) · [Google Play](https://play.google.com/store/apps/details?id=com.picolo.android) |
| Vibe Check | Truths, dares, group challenges, timed challenges, trivia, special events, custom cards, skip and sober modes | [Google Play](https://play.google.com/store/apps/details?id=com.vibegame.app) |
| Hiccup | Party mix, Never Have I Ever, Most Likely To, Truth or Dare, story follow-ups, named-player cards, alcohol-free penalties | [Google Play](https://play.google.com/store/apps/details?id=com.lyssa.hiccup) |
| 101 Drinking Games | Categories, Quick Fire, Hot Seat, Paranoia, Would You Rather, mini-games, house rules and classic card mechanics | [Google Play](https://play.google.com/store/apps/details?id=com.snowytracks.drinking) |
| Partybus Truth or Dare | Roulette and card selection, truth/dare/joker card families, selectable intensity | [App Store](https://apps.apple.com/us/app/truth-or-dare-by-partybus/id1625682712) |
| King of Booze | Choice between completing a challenge and taking a penalty, custom challenges, board-game framing | [App Store](https://apps.apple.com/ca/app/king-of-booze-drinking-game/id715048833) |
| DrinkUp | Kings Cup, Paranoia, Imposter, Most Likely To, roulette, audience presets, offline pass-and-play and dry mode | [Google Play](https://play.google.com/store/apps/details?id=io.drinkup.app) |
| Blurt | Improv scenes, acting prompts, truth/dare/drink rounds, group challenges and community-created prompts | [Google Play](https://play.google.com/store/apps/details?id=com.improvpartygame.app) |

## Content rules for TipsyTraveller

- Every drinking penalty should be replaceable with water, a soft drink, or a harmless forfeit.
- Default penalties are one sip. Avoid shots, chugging, speed drinking, mixing drinks, or “finish your drink” cards.
- Never require driving, climbing, running, dangerous balancing, unwanted touching, public posting, property damage, or revealing protected/private information.
- Every player can skip any card without explaining why.
- Keep physical prompts accessible: a seated acting, speaking, or pointing alternative should always work.
- Timers create energy, not pressure; 8–20 seconds is enough for most cards.
- Avoid cards that single out protected traits, bodies, trauma, finances, relationships, or sexual history.

## Suggested data tags

Use these tags if this bank is converted to runtime data later:

- `audience`: `team`, `duel`, `table`, `solo`
- `mechanic`: `act`, `category`, `choice`, `improv`, `memory`, `rule`, `truth`, `vote`
- `energy`: `low`, `medium`, `high`
- `durationSeconds`: optional integer
- `materials`: `none`, `coaster`, `cup`, `phone`
- `penalty`: normally `1 sip or sober forfeit`
- `safety`: `skipAllowed: true`, `alcoholOptional: true`

## Original challenge bank

All prompts below are original wording for TipsyTraveller.

### Quick-fire and categories

| ID | Title | Prompt | Failure / tie-break |
|---|---|---|---|
| `quick-01` | Three Before Five | Name three capital cities before the table counts down from five. | One sip or name a fourth city. |
| `quick-02` | Letter Luggage | Name four things you would pack that start with the chosen letter. | One sip or mime the missing item. |
| `quick-03` | Food Flight | Name a dish from three different countries in 10 seconds. | One sip or invent a dish. |
| `quick-04` | No Repeat Route | Go around naming European countries without repeats. | First pause or repeat takes one sip. |
| `quick-05` | Last-Letter Cities | Each city must start with the last letter of the previous city. | First miss takes one sip. |
| `quick-06` | Five-Sense Sprint | Name one travel memory for each of the five senses in 15 seconds. | One sip or share the funniest memory. |
| `quick-07` | Tiny Timeline | Name three things you do between waking up and leaving for a trip. | One sip or act out the sequence. |
| `quick-08` | Border Burst | Name four things found at a train station in 8 seconds. | One sip or make a station announcement. |

### Acting and charades

| ID | Title | Prompt | Failure / tie-break |
|---|---|---|---|
| `act-01` | Silent Souvenir | Mime a souvenir until your team guesses it. | One sip after 20 seconds. |
| `act-02` | Lost Tourist | Act out being completely lost without speaking. | One sip if nobody names the situation. |
| `act-03` | Hotel Review | Mime a terrible hotel feature; the team guesses the complaint. | One sip after 20 seconds. |
| `act-04` | Airport Animal | Act like an animal going through airport security. | One sip if the animal is not guessed. |
| `act-05` | Landmark Hands | Build a famous landmark using only your hands. | One sip if nobody guesses it. |
| `act-06` | Weather Report | Silently perform extreme weather while the team names it. | One sip after 15 seconds. |
| `act-07` | Wrong Vehicle | Mime travelling in the least practical vehicle imaginable. | One sip if the vehicle is not guessed. |
| `act-08` | Passport Photo | Hold a ridiculous passport-photo face while the table tries to make you laugh. | Laughing player takes one sip. |

### Improv and storytelling

| ID | Title | Prompt | Failure / tie-break |
|---|---|---|---|
| `story-01` | One-Word Journey | Tell a travel story one word per teammate for two full rounds. | A broken sentence costs one sip. |
| `story-02` | Souvenir Salesperson | Sell a random nearby object as a luxury souvenir. | One sip if nobody would buy it. |
| `story-03` | Six-Word Saga | Summarize the team's trip in exactly six words. | Wrong count costs one sip. |
| `story-04` | Two Truths, One Trip | Give two true travel facts and one invention; the table finds the fake. | Guessers or storyteller take one sip. |
| `story-05` | Delayed Translator | One player speaks gibberish; a teammate translates the holiday emergency. | One sip if either player breaks character. |
| `story-06` | Postcard Home | Deliver a 15-second postcard message from an impossible destination. | One sip if the table does not applaud. |
| `story-07` | Genre Switch | Start a holiday story; the table calls a genre halfway through and you must adapt. | One sip for pausing longer than three seconds. |
| `story-08` | Bad Tour Guide | Give confidently wrong facts about the room as if it were a landmark. | One sip if you run out before 15 seconds. |

### Team synchronization

| ID | Title | Prompt | Failure / tie-break |
|---|---|---|---|
| `team-01` | Human Compass | Without speaking, point north at the same time. | Different directions mean one team sip. |
| `team-02` | Snapshot | Build a team holiday-photo pose in 10 seconds. | One sip if anyone moves during the count. |
| `team-03` | Rhythm Relay | Pass a four-beat clap around the team twice. | The player who breaks it takes one sip. |
| `team-04` | Same Answer | On three, every teammate names a mode of transport. | If answers differ, take one team sip. |
| `team-05` | Height Check | Arrange yourselves shortest to tallest without speaking. | One team sip if the order is wrong. |
| `team-06` | Mirror Guide | In pairs, mirror slow hand movements for 15 seconds. | First mismatch costs one sip. |
| `team-07` | Group Statue | One player names a landmark; everyone freezes as part of it. | One sip if the table cannot identify it. |
| `team-08` | Countdown Chorus | Count from ten to one, alternating players with no assigned order. | Overlap or silence costs one team sip. |

### Duels and mini-games

| ID | Title | Prompt | Failure / tie-break |
|---|---|---|---|
| `duel-01` | Stare Border | Hold eye contact for 15 seconds without laughing. | First laugh takes one sip. |
| `duel-02` | Thumb Tourist | Play one round of thumb wrestling with travel commentary. | Loser takes one sip. |
| `duel-03` | Coinless Toss | Toss a coaster toward a target line; closest wins. | Loser takes one sip. |
| `duel-04` | Accent-Free Alphabet | Alternate letters of the alphabet while holding a chosen emotion. | First mistake takes one sip. |
| `duel-05` | Fast Sketch Air | Air-draw the same landmark; the table chooses the clearer version. | Losing artist takes one sip. |
| `duel-06` | Rock Paper Passport | Best-of-three rock paper scissors with dramatic commentary. | Loser takes one sip. |
| `duel-07` | Category Rally | Alternate items in a chosen travel category without repeats. | First pause takes one sip. |
| `duel-08` | Statue Switch | Copy the opponent's pose, then add one detail; repeat for four rounds. | First missed detail takes one sip. |

### Votes and social cards

| ID | Title | Prompt | Failure / tie-break |
|---|---|---|---|
| `vote-01` | Best Navigator | Point to the player you would trust most with the map. | Most votes assigns one sip or a compliment. |
| `vote-02` | Missed Train | Point to who is most likely to miss the last train. | Most votes tells a travel story or takes one sip. |
| `vote-03` | Local Celebrity | Point to who could most easily be mistaken for a local celebrity. | Most votes gives a five-second acceptance speech. |
| `vote-04` | Mystery Snack | Point to who would try the strangest local snack first. | Most votes invents and names that snack. |
| `vote-05` | Group DJ | Point to who should choose the next road-trip song. | Most votes hums the chorus or takes one sip. |
| `vote-06` | Emergency Phrasebook | Point to who could communicate best without sharing a language. | Most votes demonstrates with gestures. |
| `vote-07` | Souvenir Overpacker | Point to who would return with the heaviest suitcase. | Most votes names three imaginary purchases. |
| `vote-08` | Tour Leader | Point to who should lead the next challenge. | Most votes may delegate one sip. |

### Truth and choice

| ID | Title | Prompt | Failure / tie-break |
|---|---|---|---|
| `truth-01` | Dream Stop | Name the place you most want to visit and the first thing you would do there. | Prefer not to answer: take one sip or redraw. |
| `truth-02` | Travel Fail | Share a harmless travel mistake that is funny now. | Prefer not to answer: take one sip or redraw. |
| `truth-03` | Window or Aisle | Choose window or aisle and defend it in one sentence. | Table rejects the argument: one sip. |
| `truth-04` | Luxury or Adventure | Choose a luxury weekend or a chaotic road trip. | Minority choice takes one sip. |
| `truth-05` | Local Dish | Name a food you travelled for or would travel to try. | Cannot choose: one sip. |
| `truth-06` | Perfect Companion | Pick one fictional character as your travel partner and explain why. | No explanation: one sip. |
| `truth-07` | Revisit Ticket | Name one place you would revisit tomorrow. | Cannot choose: one sip. |
| `truth-08` | Unpopular Itinerary | Give a harmless travel opinion the table may disagree with. | If everyone agrees, assign yourself a new topic. |

### Memory and observation

| ID | Title | Prompt | Failure / tie-break |
|---|---|---|---|
| `memory-01` | Pack the Bag | Add one item to a growing packing list and repeat every previous item. | First missed item costs one sip. |
| `memory-02` | Route Recall | Name the last three countries visited in reverse order. | One sip for each missing stop, maximum two. |
| `memory-03` | Table Postcard | Study the table for five seconds, close your eyes, and name five visible items. | Fewer than five costs one sip. |
| `memory-04` | Name Chain | Say every player's name in seat order, then reverse it. | First mistake costs one sip. |
| `memory-05` | Gesture Luggage | Each player adds a packing gesture; repeat the full sequence. | First missed gesture takes one sip. |
| `memory-06` | Flag Flash | Another team names three flag colors; repeat them backwards. | One sip for a wrong order. |
| `memory-07` | Sound Map | Each teammate adds a travel sound; replay the sequence together. | One team sip after a mismatch. |
| `memory-08` | Detail Detective | Look away while one player changes one small visible detail; identify it. | One sip after two wrong guesses. |

### Temporary rules and special events

| ID | Title | Prompt | End condition |
|---|---|---|---|
| `rule-01` | No First Names | Use nicknames only. A first-name slip costs one sip. | Ends after the next challenge. |
| `rule-02` | Passport Please | Before speaking, say “Passport please.” Forgetting costs one sip. | Ends after two turns. |
| `rule-03` | Left-Hand Luggage | Hold your drink with your non-dominant hand. A slip costs one sip. | Ends after two turns. |
| `rule-04` | Question Customs | Answering any question with “yes” or “no” costs one sip. | Ends after the next challenge. |
| `rule-05` | Tiny Announcer | The active player must narrate their action in a sports-commentator voice. | Ends when the turn changes. |
| `rule-06` | Travel Buddy | Choose a buddy; when one takes a sip, the other may choose water or do a high-five. | Ends after two turns. |
| `rule-07` | Reverse Boarding | For the next group answer, play proceeds counter-clockwise. | Ends after one group answer. |
| `rule-08` | Souvenir Word | Choose a common word that nobody may say. Saying it costs one sip. | Ends after two turns. |

### Sober forfeits

Use these as one-for-one replacements for any sip:

1. Give another player a sincere compliment.
2. Do a five-second victory dance.
3. Speak in rhyme until your next turn.
4. Wear an imaginary crown until your next turn.
5. Make the next team a dramatic introduction.
6. Hum a road-trip song for five seconds.
7. Hold a postcard pose until the next roll.
8. Add one harmless custom rule for a single turn.

## Recommended first runtime set

For a balanced first import, use 32 cards: four each from Quick-fire, Acting, Improv, Team, Duels, Votes, Truth, and Memory. Add at most one temporary-rule card every four ordinary challenges. This mix keeps rounds varied without letting persistent rules dominate the board game.
