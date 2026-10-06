# Split Flipper Island: screens

Every screen in the web app, shown three ways: the drawn mockup, and real screenshots of the
prototype in light and dark mode.

What each screen does, and why, is written up in Notion:
[UI/UX](https://app.notion.com/p/3f12d5b5a25681acbd1ce88aced43c09) and
[Color Palette](https://app.notion.com/p/3f12d5b5a2568122b736dc5de331a5aa). Notion is the source
of truth for the words; this folder holds the pictures.

- `mockups/` holds the drawings (SVG, light mode). The same drawings are on the Notion UI/UX page.
- The PNG files are screenshots of the prototype running with sample data: made-up teams and
  scores, nothing from a real league night.

## 1. Welcome (`/welcome`)

First screen for anyone who isn't logged in. Explains the league and offers sign up, log in, or
a look at the standings.

| Mockup | Light | Dark |
|---|---|---|
| <img src="mockups/welcome.svg" width="240" alt="Welcome mockup"> | <img src="welcome-light.png" width="240" alt="Welcome, light mode"> | <img src="welcome-dark.png" width="240" alt="Welcome, dark mode"> |

## 2. Sign up (`/join`)

Creates a team: team name, both phone numbers, a 4-digit PIN, and a team photo.

| Mockup | Light | Dark |
|---|---|---|
| <img src="mockups/signup.svg" width="240" alt="Sign up mockup"> | <img src="signup-light.png" width="240" alt="Sign up, light mode"> | <img src="signup-dark.png" width="240" alt="Sign up, dark mode"> |

## 3. Log in (`/login`)

Team name plus PIN.

| Mockup | Light | Dark |
|---|---|---|
| <img src="mockups/login.svg" width="240" alt="Log in mockup"> | <img src="login-light.png" width="240" alt="Log in, light mode"> | <img src="login-dark.png" width="240" alt="Log in, dark mode"> |

## 4. Team home (`/`)

What a logged-in team still has to play tonight, and their best score on each machine so far.

| Mockup | Light | Dark |
|---|---|---|
| <img src="mockups/home.svg" width="240" alt="Team home mockup"> | <img src="home-light.png" width="240" alt="Team home, light mode"> | <img src="home-dark.png" width="240" alt="Team home, dark mode"> |

## 5. Submit a score (`/submit`)

Pick the machine, type the score, take a photo of the display.

| Mockup | Light | Dark |
|---|---|---|
| <img src="mockups/submit.svg" width="240" alt="Submit a score mockup"> | <img src="submit-light.png" width="240" alt="Submit a score, light mode"> | <img src="submit-dark.png" width="240" alt="Submit a score, dark mode"> |

## 6. Confirm ("Is this right?")

A last look at the machine and score before it posts. Teams can't edit a score afterward.

| Mockup | Light | Dark |
|---|---|---|
| <img src="mockups/submit-confirm.svg" width="240" alt="Confirm mockup"> | <img src="submit-confirm-light.png" width="240" alt="Confirm, light mode"> | <img src="submit-confirm-dark.png" width="240" alt="Confirm, dark mode"> |

## 7. Standings: Tonight (`/standings`)

The live scoreboard: tonight's points for every team, then one board per machine with photo
proof. Public, no login. The screenshots show the top of a longer page.

| Mockup | Light | Dark |
|---|---|---|
| <img src="mockups/standings-tonight.svg" width="240" alt="Standings tonight mockup"> | <img src="standings-tonight-light.png" width="240" alt="Standings tonight, light mode"> | <img src="standings-tonight-dark.png" width="240" alt="Standings tonight, dark mode"> |

## 8. Standings: Season (`/standings`, Season tab)

Running points, rank by week, and the standings list with arrows for places gained or lost
since last week.

| Mockup | Light | Dark |
|---|---|---|
| <img src="mockups/standings-season.svg" width="240" alt="Standings season mockup"> | <img src="standings-season-light.png" width="240" alt="Standings season, light mode"> | <img src="standings-season-dark.png" width="240" alt="Standings season, dark mode"> |

## 9. League log (`/log`)

The public record of sign-ups, scores, and corrections, newest first. The admin entries in the
mockup arrive with the admin screens in Phase 2; the prototype logs sign-ups and scores.

| Mockup | Light | Dark |
|---|---|---|
| <img src="mockups/log.svg" width="240" alt="League log mockup"> | <img src="log-light.png" width="240" alt="League log, light mode"> | <img src="log-dark.png" width="240" alt="League log, dark mode"> |

## Standings on a big screen

The same Standings page at laptop or TV width, dark mode.

<img src="desktop-standings-tonight-dark.png" width="720" alt="Standings, Tonight tab, wide screen">

<img src="desktop-standings-season-dark.png" width="720" alt="Standings, Season tab, wide screen">

## Color palette

Defined in `apps/split-flip-island/web/src/theme.ts`.

<img src="mockups/palette.svg" width="720" alt="Color palette">

## Updating these

- **Mockups:** edit the SVG files in `mockups/` by hand. To change the copy on Notion, re-upload
  the SVG there.
- **Screenshots:** re-capture from the running app after a UI change so they don't drift from
  the code. Keep the file names.
