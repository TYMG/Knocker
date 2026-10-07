// What the organizer does at the bar. The night is open: 8 of 10 teams are here, two scores
// need a look, Venom is out, and two sign-ups are waiting.
import { expect, go, open, become, showAllTeams, standingOf, standings, test } from './helpers';

test('checking in a team updates the count', async ({ page }) => {
  await open(page, '/admin/check-in', 'Admin');
  await expect(page.getByText('8 of 10 teams are here')).toBeVisible();
  await page.getByRole('button', { name: 'Check in Slam Tilt' }).click();
  await expect(page.getByText('9 of 10 teams are here')).toBeVisible();
  await page.getByRole('button', { name: 'Undo check-in for Slam Tilt' }).click();
  await expect(page.getByText('8 of 10 teams are here')).toBeVisible();
});

test('"Looks right" clears a score from the needs-a-look list', async ({ page }) => {
  await open(page, '/admin/scores', 'Admin');
  await expect(page.getByRole('button', { name: 'Needs a look 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Looks right' }).first().click();
  await expect(page.getByRole('button', { name: 'Needs a look 1' })).toBeVisible();
});

test('voiding a score needs a reason, changes the standings and goes in the public log', async ({ page }) => {
  await open(page, '/admin/scores/fc-godzilla-147m', 'Admin');
  await page.getByRole('button', { name: 'Void this score' }).click();
  const confirm = page.getByRole('button', { name: 'Void it' });
  await expect(confirm).toBeDisabled(); // no reason yet
  await page.getByRole('textbox', { name: /Why void it/ }).fill('photo shows 47 million');
  await confirm.click();
  await expect(page.getByText('This score is voided and does not count.')).toBeVisible();

  // Flip City fall back on their 61 million: 24 points becomes 20.
  await go(page, '/standings');
  await showAllTeams(page);
  expect(await standingOf(page, 'flip-city')).toMatchObject({ rank: 3, points: 20 });
  expect(await standingOf(page, 'nudge-nudge')).toMatchObject({ rank: 1, points: 27 });

  await go(page, '/standings/log');
  await expect(page.getByText("Admin voided Flip City's Godzilla score")).toBeVisible();
  await expect(page.getByText('Reason: photo shows 47 million')).toBeVisible();
});

test('correcting a score needs a reason and flips the challenge it decided', async ({ page }) => {
  await open(page, '/admin/scores/dg-pulp-124m', 'Admin');
  const save = page.getByRole('button', { name: 'Save correction' });
  await page.getByRole('textbox', { name: 'What the score should be' }).fill('12400000');
  await expect(save).toBeDisabled(); // no reason yet
  await page.getByRole('textbox', { name: 'Reason, shown in the public log' }).fill('typo, photo shows 12.4 million');
  await save.click();
  // The admin sees both numbers side by side once more before it is saved.
  await page.getByRole('dialog').getByRole('button', { name: 'Change the score' }).click();
  await expect(page.getByText(/Changed by Matt from 124,000,000 to 12,400,000/)).toBeVisible();

  await go(page, '/standings');
  await showAllTeams(page);
  expect(await standingOf(page, 'drain-gang')).toMatchObject({ points: 7 });

  await become(page, 'Team');
  await go(page, '/challenges');
  await expect(page.getByText('Nudge Nudge leads.')).toBeVisible();
});

test('approving a sign-up moves it into the league, starting next week', async ({ page }) => {
  await open(page, '/admin/teams', 'Admin');
  await expect(page.getByText(/2 waiting for approval/)).toBeVisible();
  await page.getByRole('button', { name: 'Approve Shoot Again' }).click();
  await expect(page.getByText(/1 waiting for approval/)).toBeVisible();
  await expect(page.getByText('Starts in week 6')).toBeVisible();

  // Tonight's points still count ten teams: the new team starts next week.
  await go(page, '/standings');
  await showAllTeams(page);
  expect(await standings(page)).toHaveLength(10);
});

test('removing a sign-up needs a reason', async ({ page }) => {
  await open(page, '/admin/teams', 'Admin');
  await page.getByRole('button', { name: 'Remove Ball Hogs' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox').fill('duplicate sign-up');
  await dialog.getByRole('button', { name: /Remove/ }).click();
  await expect(page.getByRole('button', { name: 'Approve Ball Hogs' })).toHaveCount(0);
  await go(page, '/standings/log');
  await expect(page.getByText('Reason: duplicate sign-up')).toBeVisible();
});

test('a message shows on every phone until it is taken down', async ({ page }) => {
  await open(page, '/admin/message', 'Admin');
  await page.getByRole('textbox', { name: 'New message' }).fill('Finals start in 10 minutes.');
  await page.getByRole('button', { name: 'Post it' }).click();

  await become(page, 'Team');
  await expect(page.getByRole('status').filter({ hasText: 'Finals start in 10 minutes.' })).toBeVisible();

  await become(page, 'Admin');
  await go(page, '/admin/message');
  await page.getByRole('button', { name: 'Take it down' }).click();
  await expect(page.getByText('Nothing is showing.')).toBeVisible();
  await become(page, 'Team');
  await expect(page.getByText('Finals start in 10 minutes.')).toHaveCount(0);
});

test('putting Venom back in play makes its scores count', async ({ page }) => {
  await open(page, '/admin/lineup', 'Admin');
  await page.getByRole('button', { name: 'Venom, in' }).click();
  // Its three early scores would count again, so the admin is asked to confirm.
  await page.getByRole('dialog').getByRole('button', { name: 'Put it back' }).click();
  await go(page, '/standings');
  await showAllTeams(page);
  // Nudge Nudge had the best Venom score: 26 points becomes 36.
  expect(await standingOf(page, 'nudge-nudge')).toMatchObject({ rank: 1, points: 36 });
  expect(await standingOf(page, 'drain-gang')).toMatchObject({ points: 18 });
});

test('taking a machine out mid-night needs a reason, drops its scores and empties its line', async ({ page }) => {
  await open(page, '/admin/lineup', 'Admin');
  await page.getByRole('button', { name: 'Godzilla, out' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox').fill('ball stuck');
  await dialog.getByRole('button', { name: 'Take it out' }).click();

  await go(page, '/standings');
  await showAllTeams(page);
  // Without Godzilla, Nudge Nudge keep 9 from Pulp Fiction and 10 from South Park.
  expect(await standingOf(page, 'nudge-nudge')).toMatchObject({ points: 19 });

  await become(page, 'Team');
  await go(page, '/lines');
  await expect(page.getByText('You are not in a line')).toBeVisible();
});

test('an admin can enter a score for a team whose phone died', async ({ page }) => {
  await open(page, '/admin/enter-score', 'Admin');
  await page.getByRole('combobox', { name: 'Team' }).click();
  await page.getByRole('option', { name: /Slam Tilt/ }).click();
  await page.getByRole('combobox', { name: 'Machine' }).click();
  await page.getByRole('option', { name: /South Park/ }).click();
  await page.getByRole('textbox', { name: 'Score' }).fill('30000000');
  await page.getByRole('textbox', { name: 'Reason, shown in the public log' }).fill('phone died');
  await page.getByRole('button', { name: 'Enter score' }).click();

  await go(page, '/standings');
  await showAllTeams(page);
  // 30 million is 6th of 7 on South Park, worth 5 points.
  expect(await standingOf(page, 'slam-tilt')).toMatchObject({ points: 5 });
  await go(page, '/standings/log');
  await expect(page.getByText('Admin entered a score for Slam Tilt on South Park')).toBeVisible();
});

test('closing the night stops scores, and it can be reopened', async ({ page }) => {
  await open(page, '/admin/night', 'Admin');
  await page.getByRole('button', { name: 'Close the night now' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Close the night', exact: true }).click();
  await expect(page.getByText(/^closed$/i).first()).toBeVisible();

  await become(page, 'Team');
  await go(page, '/submit');
  await expect(page.getByText('Scores can only be submitted during league night.')).toBeVisible();
  await go(page, '/lines');
  await expect(page.getByRole('button', { name: /Sign up for/ })).toHaveCount(0);

  await become(page, 'Admin');
  await go(page, '/admin/night');
  await page.getByRole('button', { name: 'Reopen week 5' }).click();
  await expect(page.getByText(/^open$/i).first()).toBeVisible();
});

test('adding 15 minutes moves the closing time', async ({ page }) => {
  await open(page, '/admin/night', 'Admin');
  await expect(page.getByText(/48 minutes left/)).toBeVisible();
  await page.getByRole('button', { name: 'Add 15 minutes' }).click();
  await expect(page.getByText(/1 hour 3 minutes left/)).toBeVisible();
});

test('skipping a week moves the later weeks back', async ({ page }) => {
  await open(page, '/admin/weeks', 'Admin');
  await page.getByRole('button', { name: 'Skip a week' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByText('Week 7').click();
  await dialog.getByRole('button', { name: /Skip/ }).click();
  await expect(page.getByText('No league night on Wednesday, November 25').first()).toBeVisible();
  await expect(page.getByText(/Wednesday, December 16/).first()).toBeVisible(); // finals, one week later
});

test('the admin can send a team to the back of a line', async ({ page }) => {
  await open(page, '/admin/lines', 'Admin');
  await page.getByRole('button', { name: 'Send Drain Gang to the back of the Godzilla line' }).click();
  await become(page, 'Team');
  await go(page, '/lines');
  // Drain Gang were playing Godzilla; Left & Right move up from 3rd to next.
  await expect(page.getByText('You are next on Godzilla')).toBeVisible();
});
