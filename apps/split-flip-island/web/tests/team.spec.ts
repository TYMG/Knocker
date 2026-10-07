// What a team does on league night. You are Left & Right: 7th tonight with 12 points,
// South Park still to play, 3rd in line for Godzilla.
import { expect, go, open, showAllTeams, standingOf, test } from './helpers';

test('posting a score moves the team up the standings', async ({ page }) => {
  await open(page, '/standings', 'Team');
  await showAllTeams(page);
  expect(await standingOf(page, 'left-and-right')).toMatchObject({ rank: 7, points: 12 });

  await go(page, '/submit');
  await page.getByRole('group', { name: 'Machine' }).getByText('South Park').click();
  await page.getByRole('button', { name: 'Use a sample photo' }).click();
  await page.getByRole('textbox', { name: 'Score' }).fill('24680130');
  await page.getByRole('button', { name: 'Review score' }).click();

  // The review step shows the number back before anything is posted.
  await expect(page.getByRole('heading', { name: 'Is this right?' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Score 24,680,130' })).toBeVisible();
  await page.getByRole('button', { name: 'Submit score' }).click();

  await expect(page).toHaveURL(/\/standings$/);
  await showAllTeams(page);
  expect(await standingOf(page, 'left-and-right')).toMatchObject({ rank: 5, points: 17 });

  // Home agrees, and South Park is no longer waiting to be played.
  await go(page, '/');
  await expect(page.getByText('5th of 10, 17 points')).toBeVisible();
  await expect(page.getByText('Every machine played. Go again to beat your best.')).toBeVisible();
  await expect(page.getByText('You moved up to 5th tonight.')).toBeVisible();
});

test('"Fix it" on the review step goes back with nothing lost', async ({ page }) => {
  await open(page, '/submit?machine=south-park', 'Team');
  await page.getByRole('button', { name: 'Use a sample photo' }).click();
  await page.getByRole('textbox', { name: 'Score' }).fill('1234567');
  await page.getByRole('button', { name: 'Review score' }).click();
  await page.getByRole('button', { name: 'Fix it' }).click();
  await expect(page.getByRole('textbox', { name: 'Score' })).toHaveValue('1,234,567');
  await expect(page.getByRole('button', { name: 'Review score' })).toBeEnabled();
});

test('a score cannot be reviewed until it has a machine, a photo and a number', async ({ page }) => {
  await open(page, '/submit', 'Team');
  const review = page.getByRole('button', { name: 'Review score' });
  await expect(review).toBeDisabled();
  await page.getByRole('group', { name: 'Machine' }).getByText('South Park').click();
  await page.getByRole('textbox', { name: 'Score' }).fill('5000000');
  await expect(review).toBeDisabled(); // still no photo
  await page.getByRole('button', { name: 'Use a sample photo' }).click();
  await expect(review).toBeEnabled();
});

test('a team can leave its line and sign up for another one', async ({ page }) => {
  await open(page, '/lines', 'Team');
  await expect(page.getByText('You are 3rd in line for Godzilla')).toBeVisible();

  await page.getByRole('button', { name: 'Leave this line' }).click();
  await expect(page.getByText('You are not in a line')).toBeVisible();

  await page.getByRole('link', { name: 'Sign up for Pulp Fiction' }).click();
  await expect(page).toHaveURL(/\/lines\/join\/pulp-fiction$/);
  await expect(page.getByText('You will be next')).toBeVisible();
  await page.getByRole('button', { name: 'Sign up for Pulp Fiction' }).click();

  await expect(page).toHaveURL(/\/lines$/);
  await expect(page.getByText('You are next on Pulp Fiction')).toBeVisible();
});

test('posting a score on a machine takes the team out of that machine\'s line', async ({ page }) => {
  await open(page, '/submit?machine=godzilla', 'Team');
  await page.getByRole('button', { name: 'Use a sample photo' }).click();
  await page.getByRole('textbox', { name: 'Score' }).fill('60000000');
  await page.getByRole('button', { name: 'Review score' }).click();
  await page.getByRole('button', { name: 'Submit score' }).click();
  await go(page, '/lines');
  await expect(page.getByText('You are not in a line')).toBeVisible();
});

test('accepting a call-out makes it live', async ({ page }) => {
  await open(page, '/call-outs', 'Team');
  await expect(page.getByText('Flip City called you out on Godzilla.')).toBeVisible();
  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(page.getByText('Flip City called you out on Godzilla.')).toHaveCount(0);
  // Flip City's 147 million is ahead of Left & Right's 89 million.
  await expect(page.getByText('Flip City leads.')).toBeVisible();
});

test('the machine page shows its line and tonight\'s board', async ({ page }) => {
  await open(page, '/machines/godzilla', 'Team');
  await expect(page.getByRole('heading', { name: 'Godzilla' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Score 147,270,340' }).first()).toBeVisible();
  await expect(page.getByText('(you)').first()).toBeVisible();

  // Venom broke at 7:40 PM: no submit button, and its scores are marked as not counting.
  await go(page, '/machines/venom');
  await expect(page.getByText(/Out tonight/).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Submit a score/ })).toHaveCount(0);
});
