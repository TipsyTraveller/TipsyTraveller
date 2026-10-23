# Game Challenges

Dit bestand verzamelt ideeën voor challenges in de mobiele teamgame. Voeg nieuwe ideeën onderaan toe als `Challenge 2`, `Challenge 3`, enzovoort. Het is een **ideeën- en functioneel overzicht**, geen definitieve implementatie.

## Overzicht

| ID | Naam | Type | Status |
| --- | --- | --- | --- |
| 1 | Raad het landwoord | Team / uitlegspel | Idee |

---

## Challenge 1 — Raad het landwoord

### Concept
Wanneer een team in een land terechtkomt (bijvoorbeeld **Frankrijk**), start een woordraad-challenge die bij dat land past. Eén willekeurig geselecteerde speler legt een geheim woord uit aan de rest van het team, zonder het woord zelf te zeggen. Het team heeft **30 seconden** om te raden.

### Spelverloop
1. **Trigger:** het team komt in een land terecht.
2. **Speler kiezen:** de app kiest willekeurig één speler uit het actieve team.
3. **Gsm doorgeven:** toon bijvoorbeeld: **'Geef de gsm aan [spelernaam]'**.
4. **Geheim woord tonen:** na een tik op **'Ik ben klaar'** ziet alleen die speler een woord dat bij het land hoort (bijvoorbeeld Frankrijk → **Eiffeltoren**).
5. **Start:** de speler tikt op **'Start'**; de afteltimer van 30 seconden begint.
6. **Uitleggen en raden:** de gekozen speler omschrijft het woord zonder het letterlijk te noemen. De andere teamleden proberen het te raden.
7. **Resultaat registreren:** het team kiest **'Geraden'** of **'Niet gelukt'**. Bij het verstrijken van de tijd wordt het resultaat automatisch **'Niet gelukt'** als er nog geen succes is geregistreerd.
8. **Score tonen:** de app kent punten toe op basis van het resultaat en toont een korte bevestiging.

### Voorbeeldschermen / UI
- **Intro:** `Jullie zijn in Frankrijk!` + `Geef de gsm aan Emma`.
- **Privéwoord:** `Jouw woord: Eiffeltoren` + knop `Start`.
- **Spelen:** afteltimer `00:30` + knoppen `Geraden` en `Niet gelukt`. **Verberg het geheime woord** op dit scherm zodat het team niet kan spieken.
- **Resultaat:** `Geraden! +10 punten` of `Niet gelukt — 0 punten` (voorlopige puntensuggestie).

### Spelregels
- De uitlegger mag het doelwoord niet letterlijk zeggen.
- De uitlegger mag niet een deel van het doelwoord verklappen.
- Geen vertalingen of spelling van het woord gebruiken (voorlopige regel; kan aangepast worden).
- Alleen het actieve team mag raden.

### Punten (voorlopig voorstel)
| Resultaat | Punten |
| --- | ---: |
| Geraden binnen 30 seconden | +10 |
| Niet geraden / tijd verstreken | 0 |

> Puntentoekenning en tijdsduur zijn configureerbaar. De exacte waardes kunnen later met andere challenges gebalanceerd worden.

### Technische notities voor implementatie
- **Input:** `countryId`, `teamId`, lijst van actieve teamspelers.
- **Selectie:** willekeurige speler uit het team en willekeurig woord uit een woordenlijst per land.
- **State:** `intro → secretWord → playing → result`.
- **Timer:** 30 seconden, pas starten na bevestiging van de uitlegger.
- **Resultaat:** `success | failure | timeout`, met de verdiende punten gekoppeld aan het team.
- **Content:** per land een uitbreidbare verzameling herkenbare woorden (bv. Frankrijk: Eiffeltoren, croissant, baguette, Louvre).
- **Privacy/spelplezier:** toon het woord alleen vóór de timer; scherm het daarna af.
- **Later te beslissen:** moeten woorden herhaald kunnen worden, hoe ga je om met slechts één speler in een team, en moet de moeilijkheid per woord instelbaar zijn?

---

## Template voor nieuwe challenges

Kopieer dit blok onderaan telkens wanneer er een idee bijkomt:

```md
## Challenge X — Naam

### Concept
<Korte beschrijving>

### Spelverloop
1. <Stap 1>
2. <Stap 2>

### Voorbeeldschermen / UI
- <Welke tekst, knoppen of animaties verschijnen?>

### Spelregels
- <Regels>

### Punten (voorlopig voorstel)
- Succes: <punten>
- Mislukt: <punten>

### Technische notities voor implementatie
- Trigger:
- Input:
- State:
- Timer:
- Overige:
```
