// Scenarios for the features added on 2026-10-07: the admin bottom bar, the machine page's
// score list, heat map and dots chart, the Love Dr., and challenges played for points.
// These were written with the features and have not been run yet.
import { expect, go, open, become, showAllTeams, standingOf, test } from './helpers';

const bar = (page: import('@playwright/test').Page) => page.locator('.MuiBottomNavigation-root');

test('an admin gets the team bottom bar plus Admin', async ({ page }) => {
  await open(page, '/admin', 'Admin');
  for (const label of ['Home', 'Lines', 'Submit', 'Standings', 'Admin']) await expect(bar(page).getByRole('link', { name: label, exact: true })).toBeVisible();
});

test('a team does not get the Admin tab', async ({ page }) => {
  await open(page, '/', 'Team');
  await expect(bar(page).getByRole('link', { name: 'Standings', exact: true })).toBeVisible();
  await expect(bar(page).getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
});

test('for an admin with no team, Home is the standings, Submit enters a score for a team and Lines shows every line', async ({ page }) => {
  await open(page, '/admin', 'Admin');
  await bar(page).getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL(/\/standings$/);
  await bar(page).getByRole('link', { name: 'Submit', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/enter-score$/);
  await expect(page.getByRole('combobox', { name: 'Team' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Machine' })).toBeVisible();
  await bar(page).getByRole('link', { name: 'Lines', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/lines$/);
});

test('an admin who is on a team keeps the team pages', async ({ page }) => {
  await open(page, '/tour');
  await page.getByRole('group', { name: 'View the app as' }).getByRole('button', { name: 'Admin + team', exact: true }).click();
  await bar(page).getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Left & Right' })).toBeVisible();
  await bar(page).getByRole('link', { name: 'Submit', exact: true }).click();
  await expect(page).toHaveURL(/\/submit$/);
  await bar(page).getByRole('link', { name: 'Admin', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Admin home' })).toBeVisible();
});

test('the machine page lists every score and charts where scores land', async ({ page }) => {
  await open(page, '/machines/godzilla');
  await expect(page.getByRole('heading', { name: 'Where scores land' })).toBeVisible();
  await expect(page.getByText(/Average Godzilla score this season/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Every score' })).toBeVisible();
  // Nudge Nudge played Godzilla three times tonight; all three show, not just the best.
  await expect(page.getByRole('img', { name: 'Score 40,118,250' })).toBeVisible();
  await page.getByRole('group', { name: 'Week to show' }).getByRole('button', { name: 'Wk 1' }).click();
  await expect(page.getByText(/in week 1/)).toBeVisible();
});

test('the Love Dr. is on a team\'s own home and nowhere public', async ({ page }) => {
  await open(page, '/', 'Team');
  await expect(page.getByRole('heading', { name: 'The Love Dr.' })).toBeVisible();
  await expect(page.getByText('Only your team sees this')).toBeVisible();
  await expect(page.getByText('Relationship status')).toBeVisible();
  await expect(page.getByTestId('relationship-status').getByText('Tough love')).toBeVisible();
  await become(page, 'Visitor');
  await go(page, '/teams/left-and-right');
  await expect(page.getByText('The Love Dr.')).toHaveCount(0);
});

test('a challenge is for 10 points at most and one a night between two teams', async ({ page }) => {
  await open(page, '/challenges', 'Team');
  await page.getByRole('button', { name: 'Challenge a team' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Team' }).click();
  // Flip City already challenged Left & Right tonight, so they cannot be picked again.
  await expect(page.getByRole('option', { name: /Flip City/ })).toBeDisabled();
  await page.getByRole('option', { name: /Bumper Crop/ }).click();
  await dialog.getByRole('combobox', { name: 'Points to put on it' }).click();
  await expect(page.getByRole('option')).toHaveCount(10);
  await page.getByRole('option', { name: '3 points', exact: true }).click();
  await dialog.getByRole('combobox', { name: 'Machine' }).click();
  await page.getByRole('option', { name: 'South Park' }).click();
  await dialog.getByRole('button', { name: 'Send challenge' }).click();
  await expect(page.getByText('You challenged Bumper Crop on South Park.')).toBeVisible();
});

test('when the night closes, the loser\'s points go to the winner in the season standings', async ({ page }) => {
  await open(page, '/challenges', 'Team');
  await page.getByRole('button', { name: "Accept Flip City's challenge" }).click();
  // A live challenge offers the score button right there.
  await expect(page.getByRole('link', { name: 'Submit a score on Godzilla' })).toBeVisible();

  // Flip City's 147 million is thrown out, so Left & Right's 89 million wins the 10 points.
  await become(page, 'Admin');
  await go(page, '/admin/scores/fc-godzilla-147m');
  await page.getByRole('button', { name: 'Void this score' }).click();
  await page.getByRole('textbox', { name: /Why void it/ }).fill('photo shows 47 million');
  await page.getByRole('button', { name: 'Void it' }).click();
  await go(page, '/standings');
  await showAllTeams(page);
  expect(await standingOf(page, 'left-and-right')).toMatchObject({ points: 13 });
  expect(await standingOf(page, 'flip-city')).toMatchObject({ points: 20 });

  await go(page, '/standings/season');
  expect(await standingOf(page, 'left-and-right')).toMatchObject({ points: 129 });
  expect(await standingOf(page, 'flip-city')).toMatchObject({ points: 114 });

  await go(page, '/admin/night');
  await page.getByRole('button', { name: 'Close the night now' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Close the night', exact: true }).click();
  // The night's own points are untouched by the challenge...
  await go(page, '/standings');
  await showAllTeams(page);
  expect(await standingOf(page, 'left-and-right')).toMatchObject({ points: 13 });
  expect(await standingOf(page, 'flip-city')).toMatchObject({ points: 20 });
  // ...the 10 points move in the season standings.
  await go(page, '/standings/season');
  expect(await standingOf(page, 'left-and-right')).toMatchObject({ points: 139 });
  expect(await standingOf(page, 'flip-city')).toMatchObject({ points: 104 });
  await go(page, '/standings/log');
  await expect(page.getByText('Left & Right won 10 points from Flip City on Godzilla')).toBeVisible();
});

test('the season high on each machine is shown as a 10 point bonus to chase', async ({ page }) => {
  await open(page, '/standings/season');
  await expect(page.getByRole('heading', { name: 'Season high bonus' })).toBeVisible();
  await expect(page.getByText('+10 if it holds').first()).toBeVisible();
  await go(page, '/machines/godzilla');
  await expect(page.getByText(/gets 10 extra points/)).toBeVisible();
});

// ---- Rolling numbers, confetti and calm mode (Build Plan phases 0 and 1) ----

test('a score that beats the season high says so and throws confetti', async ({ page }) => {
  await open(page, '/submit?machine=south-park', 'Team');
  await page.getByRole('button', { name: 'Use a sample photo' }).click();
  await page.getByRole('textbox', { name: 'Score' }).fill('999999999');
  await page.getByRole('button', { name: 'Review score' }).click();
  await page.getByRole('button', { name: 'Submit score' }).click();
  await expect(page.getByText('New season high on South Park! Worth 10 bonus points if it stands.')).toBeVisible();
  // canvas-confetti draws on a canvas it adds to the page.
  await expect(page.locator('body > canvas')).toHaveCount(1);
});

test('calm mode stops the confetti and is remembered', async ({ page }) => {
  await open(page, '/standings', 'Team');
  await page.getByRole('button', { name: 'Calm mode' }).click();
  await expect(page.getByText('Calm mode is on. No confetti or big animations.')).toBeVisible();
  await go(page, '/submit?machine=south-park');
  await page.getByRole('button', { name: 'Use a sample photo' }).click();
  await page.getByRole('textbox', { name: 'Score' }).fill('999999999');
  await page.getByRole('button', { name: 'Review score' }).click();
  await page.getByRole('button', { name: 'Submit score' }).click();
  await expect(page.getByText('New season high on South Park! Worth 10 bonus points if it stands.')).toBeVisible();
  await expect(page.locator('body > canvas')).toHaveCount(0);
  expect(await page.evaluate(() => window.localStorage.getItem('sfi-calm'))).toBe('1');
});

// ---- The Love Dr. as coach (Build Plan phase 2, steps 2.1 to 2.4) ----

test("tonight's prescription tells the team which machine to play next", async ({ page }) => {
  await open(page, '/', 'Team');
  const rx = page.getByTestId('prescription');
  // Left & Right have not played South Park yet, and are in the Godzilla line.
  await expect(rx.getByText('Playing hard to get: South Park')).toBeVisible();
  await expect(rx.getByText(/That means leaving the Godzilla line/)).toBeVisible();
  await rx.getByRole('link', { name: 'Switch to the South Park line' }).click();
  await expect(page).toHaveURL(/\/lines\/join\/south-park$/);
});

test("Doctor's orders pops up once after check-in and can be opened again by hand", async ({ page }) => {
  await open(page, '/', 'Team', { drPopups: true });
  const orders = page.getByRole('dialog', { name: "Doctor's orders" });
  await expect(orders).toBeVisible();
  await expect(orders.getByText(/You are 3rd in the season/)).toBeVisible();
  await orders.getByRole('button', { name: "Let's play" }).click();
  await expect(orders).toBeHidden();

  // It does not come back on its own.
  await go(page, '/standings');
  await go(page, '/');
  await expect(orders).toBeHidden();

  // The Love Dr. card can open it again, and "See the analysis" opens the full analysis page.
  await page.getByRole('button', { name: "Tonight's Doctor's orders" }).click();
  await orders.getByRole('button', { name: 'See the analysis' }).click();
  await expect(orders).toBeHidden();
  await expect(page).toHaveURL(/\/love-dr$/);
  await expect(page.getByRole('heading', { name: 'The Love Dr.', exact: true })).toBeVisible();
});

test("the Dr.'s pop-ups can be switched off", async ({ page }) => {
  await open(page, '/', 'Team');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: 'Pop-ups from the Dr.' })).not.toBeChecked();
});

test("the Love Dr.'s full analysis has every part and is for the team only", async ({ page }) => {
  await open(page, '/', 'Team');
  await page.getByRole('link', { name: 'See the full analysis' }).click();
  await expect(page).toHaveURL(/\/love-dr$/);
  await expect(page.getByTestId('couple-type')).toContainText('What kind of couple');
  await expect(page.getByTestId('prescription')).toBeVisible();
  await expect(page.getByTestId('relationship-status')).toContainText(/Week 1: \d/);
  await expect(page.getByTestId('check-up')).toContainText("Doctor's orders");
  await expect(page.getByText('How the Dr. decides')).toBeVisible();
});

test('team home shows what the Dr. noticed tonight', async ({ page }) => {
  await open(page, '/', 'Team');
  await expect(page.getByTestId('dr-notes')).toContainText('Heartbreaker');
});

test("the standings carry Doctor's orders: one note for everyone, one only for your team", async ({ page }) => {
  await open(page, '/standings', 'Visitor');
  const note = page.getByTestId('dr-standings-note');
  await expect(note).toContainText("Doctor's orders");
  await expect(note.getByText(/Nobody else sees this/)).toHaveCount(0);

  await open(page, '/standings', 'Team');
  await expect(note.getByText(/Just for Left & Right/)).toBeVisible();
  await go(page, '/standings/season');
  await expect(note.getByText(/You are 3rd in the season/)).toBeVisible();
});

test('a team page says what kind of couple they are, without the private advice', async ({ page }) => {
  await open(page, '/teams/tilt-me-tender', 'Visitor');
  await expect(page.getByTestId('couple-type')).toContainText('What kind of couple');
});

test('the season page has the Nivo charts: running points, rank by week and capture the flag', async ({ page }) => {
  await open(page, '/standings/season', 'Team');
  await expect(page.getByRole('img', { name: /Running season points by week/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /place in the standings, week by week/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Capture the flag' })).toBeVisible();
  // Tapping a team in the key keeps it lit.
  const mine = page.getByRole('button', { name: /Left & Right.*your team/ });
  await mine.click();
  await expect(mine).toHaveAttribute('aria-pressed', 'true');
});

test('the machine page has the score heat map and every game as a dot', async ({ page }) => {
  await open(page, '/machines/godzilla', 'Team');
  await expect(page.getByRole('img', { name: /Heat map of Godzilla scores by week/ })).toBeVisible();
  const dots = page.getByRole('img', { name: /Every Godzilla game this season as a dot/ });
  await expect(dots).toBeVisible();
  // Tap a dot and the game shows underneath, with its team and photo.
  await dots.locator('circle').first().click({ force: true });
  await expect(page.getByTestId('swarm-picked')).toBeVisible();
});

test('the Love Dr. says which machine they lean toward', async ({ page }) => {
  await open(page, '/', 'Team');
  await expect(page.getByText(/Right now I lean toward /)).toBeVisible();
  await expect(page.getByRole('img', { name: /Average points a night by machine/ })).toBeVisible();
});

test('pages still open with calm mode on, with no sliding', async ({ page }) => {
  await open(page, '/', 'Team');
  await page.getByRole('button', { name: 'Calm mode' }).click();
  await page.getByRole('link', { name: 'Standings' }).last().click();
  await expect(page).toHaveURL(/\/standings$/);
  await expect(page.getByRole('main')).toBeVisible();
});
