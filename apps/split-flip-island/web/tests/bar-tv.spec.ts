// The screen behind the bar. Nobody touches it, so everything must fit without scrolling.
import { expect, open, test } from './helpers';

for (const size of [{ width: 1600, height: 900 }, { width: 1920, height: 1080 }]) {
  test(`the bar TV fits a ${size.width} by ${size.height} screen with no scrolling`, async ({ page }) => {
    await page.setViewportSize(size);
    await open(page, '/tv');
    await expect(page.getByText("Tonight's points")).toBeVisible();
    await expect(page.getByText('Venom is down for the night. Last scores at 8:45.')).toBeVisible();
    await expect(page.getByText('Multiball Mates')).toBeVisible(); // the last team is on screen
    const extra = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    expect(extra, 'the page is taller than the screen').toBeLessThanOrEqual(1);
  });
}
