// Finding the league, signing up, logging in, and what each kind of visitor is allowed to see.
import { expect, go, open, become, test } from './helpers';

test('the front door leads to sign-up and to the standings', async ({ page }) => {
  await open(page, '/');
  await expect(page.getByRole('heading', { name: 'Split Flipper Island' })).toBeVisible();
  await page.getByRole('link', { name: 'Sign up your team' }).first().click();
  await expect(page).toHaveURL(/\/join$/);
});

test('logging in needs a real team name', async ({ page }) => {
  await open(page, '/login');
  await page.getByRole('textbox', { name: 'Team name' }).fill('Nobody Here');
  await page.getByRole('textbox', { name: 'PIN' }).fill('1234');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByText('No team by that name. Check the spelling.')).toBeVisible();

  await page.getByRole('textbox', { name: 'Team name' }).fill('left & right');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Left & Right' })).toBeVisible();
});

test('a new team waits for an admin, who can then approve it', async ({ page }) => {
  await open(page, '/join');
  await page.getByRole('textbox', { name: 'Team name' }).fill('Tilt Happens');
  await page.getByRole('textbox', { name: 'Player 1 phone' }).fill('2025550190');
  await page.getByRole('textbox', { name: 'Player 2 phone' }).fill('2025550191');
  await page.getByRole('textbox', { name: '4-digit PIN' }).fill('4821');
  await page.getByRole('textbox', { name: 'PIN again' }).fill('4821');
  await page.getByRole('button', { name: 'Use a sample photo' }).click();
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Waiting for approval', { exact: true })).toBeVisible();
  // A team that is not approved cannot post scores.
  await go(page, '/submit');
  await expect(page.getByText('Waiting for approval', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review score' })).toHaveCount(0);

  await become(page, 'Admin');
  await go(page, '/admin/teams');
  await page.getByRole('button', { name: 'Approve Tilt Happens' }).click();
  await expect(page.getByRole('button', { name: 'Approve Tilt Happens' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Tilt Happens/ })).toBeVisible();
});

test('a team name that is taken, or PINs that differ, stop the sign-up', async ({ page }) => {
  await open(page, '/join');
  await page.getByRole('textbox', { name: 'Team name' }).fill('Flip City');
  await page.getByRole('textbox', { name: 'Player 1 phone' }).fill('2025550190');
  await page.getByRole('textbox', { name: 'Player 2 phone' }).fill('2025550191');
  await page.getByRole('textbox', { name: '4-digit PIN' }).fill('4821');
  await page.getByRole('textbox', { name: 'PIN again' }).fill('4822');
  await page.getByRole('button', { name: 'Use a sample photo' }).click();
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await expect(page).toHaveURL(/\/join$/);
  await expect(page.getByText('That name is taken. Pick another one.')).toBeVisible();
  await expect(page.getByText('The two PINs do not match.')).toBeVisible();
});

test('a visitor cannot reach team pages or admin pages', async ({ page }) => {
  await open(page, '/lines');
  await expect(page.getByRole('heading', { name: 'Log in first' })).toBeVisible();
  await go(page, '/submit');
  await expect(page.getByRole('heading', { name: 'Log in first' })).toBeVisible();
  await go(page, '/admin/scores');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole('heading', { name: 'League admin log in' })).toBeVisible();
});

test('a team cannot reach admin pages', async ({ page }) => {
  await open(page, '/admin/teams', 'Team');
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test('the public standings need no login and show both scoring options', async ({ page }) => {
  await open(page, '/standings/season');
  const rows = page.getByTestId('standing-row');
  await expect(rows.first()).toHaveAttribute('data-team', 'tilt-me-tender');
  // Under "Rank the night" a different team leads.
  await page.getByRole('button', { name: 'Rank the night' }).click();
  await expect(rows.first()).toHaveAttribute('data-team', 'nudge-nudge');
});

test('phone numbers never appear on public pages', async ({ page }) => {
  for (const path of ['/standings', '/standings/log', '/teams/flip-city', '/machines/godzilla']) {
    await open(page, path);
    await expect(page.getByText(/\(\d{3}\) \d{3}-\d{4}/)).toHaveCount(0);
  }
});

test('switching from admin to team while on an admin page goes home, not to the admin log-in', async ({ page }) => {
  await open(page, '/admin/message', 'Admin');
  await become(page, 'Team');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Left & Right' })).toBeVisible();
});
