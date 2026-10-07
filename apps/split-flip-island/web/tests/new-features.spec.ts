// Scenarios for the features added on 2026-10-07: the admin bottom bar, the machine page's
// score list and bubble chart, the Love Dr., and challenges played for points.
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
  await expect(page.getByText(/True love/)).toBeVisible();
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
