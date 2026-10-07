import { expect, test as base, type Page } from '@playwright/test';

/**
 * Use this `test` in every scenario. It fails a scenario if the page throws an error or logs
 * one to the console, even when everything on screen looked right.
 */
export const test = base.extend<{ problems: string[] }>({
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('pageerror', (err) => problems.push(`page error: ${err.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') problems.push(`console error: ${msg.text()}`);
      });
      await use(problems);
      expect(problems, 'the page reported errors').toEqual([]);
    },
    { auto: true }
  ]
});

export { expect };

export type Viewer = 'Visitor' | 'Team' | 'Admin';

/**
 * Opens a page as a visitor, as the team Left & Right, or as the admin. Every scenario starts
 * from the same story: 8:12 PM, week 5, 48 minutes left (see src/sample/README.md).
 */
export async function open(page: Page, path: string, as: Viewer = 'Visitor') {
  await page.goto('/tour');
  if (as !== 'Visitor') await page.getByRole('group', { name: 'View the app as' }).getByRole('button', { name: as, exact: true }).click();
  await go(page, path);
}

/** Switches who you are part way through a scenario, keeping everything done so far. */
export async function become(page: Page, as: Viewer) {
  await page.getByRole('group', { name: 'View the app as' }).getByRole('button', { name: as, exact: true }).click();
}

/** Goes to another page, keeping who you are and everything done so far in the scenario. */
export async function go(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole('main')).toBeVisible();
}

export interface Standing {
  team: string;
  rank: number;
  points: number;
}

/** Reads a standings table top to bottom. `nth` picks the table when a page has more than one. */
export async function standings(page: Page): Promise<Standing[]> {
  const rows = page.getByTestId('standing-row');
  await expect(rows.first()).toBeVisible();
  return rows.evaluateAll((els) => els.map((el) => ({ team: el.getAttribute('data-team')!, rank: Number(el.getAttribute('data-rank')), points: Number(el.getAttribute('data-points')) })));
}

/** One team's row from a standings table, or undefined if it is not showing. */
export async function standingOf(page: Page, team: string): Promise<Standing | undefined> {
  return (await standings(page)).find((r) => r.team === team);
}

/** The page must fit the screen's width: sideways scrolling on a phone is always a bug. */
export async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'the page is wider than the screen').toBeLessThanOrEqual(1);
}

/** Shows every team in Tonight's points (the list starts with the top 6). */
export async function showAllTeams(page: Page) {
  const more = page.getByRole('button', { name: /Show all \d+ teams/ });
  if (await more.count()) await more.click();
}
