// Opens every page listed in the guide (src/sample/tour.ts) as the right person, at phone size,
// and checks the basics: it has its title, nothing is broken, and it fits the screen.
// A page added to the guide is covered here automatically.
import { TOUR } from '../src/sample/tour';
import { expect, expectNoSidewaysScroll, open, test, type Viewer } from './helpers';

const VIEWER: Record<string, Viewer> = { visitor: 'Visitor', team: 'Team', admin: 'Admin' };

for (const page of TOUR) {
  test(`${page.group}: "${page.title}" opens for ${page.role === 'visitor' ? 'anyone' : `a logged-in ${page.role}`}`, async ({ page: browser }) => {
    // The bar TV is built for the screen behind the bar, not a phone.
    if (page.path === '/tv') await browser.setViewportSize({ width: 1600, height: 900 });
    await open(browser, page.example, VIEWER[page.role]);

    await expect(browser).toHaveURL(new RegExp(`${page.example.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
    await expect(browser.getByRole('heading').first()).toBeVisible();
    await expect(browser.getByText('Not built yet')).toHaveCount(0);
    await expect(browser.getByText(/not found/i)).toHaveCount(0);
    await expectNoSidewaysScroll(browser);

    // "About this page" must know this page.
    await browser.getByRole('button', { name: 'About this page' }).click();
    await expect(browser.getByRole('heading', { name: page.title, exact: true })).toBeVisible();
  });
}

test('the same pages still fit the screen in the light theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => localStorage.setItem('mui-mode', 'light'));
  for (const path of ['/', '/standings', '/standings/season', '/teams/flip-city']) {
    await open(page, path);
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expectNoSidewaysScroll(page);
  }
});
