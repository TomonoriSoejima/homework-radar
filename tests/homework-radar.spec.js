const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8080';

test.describe('Homework Radar', () => {
  test('lists all assignments from assignments.json', async ({ page, request }) => {
    const data = await (await request.get(`${BASE_URL}/assignments.json`)).json();

    await page.goto(BASE_URL);

    const cards = page.locator('.assignment-card');
    await expect(cards).toHaveCount(data.length);
    await expect(page.locator('#totalCount')).toHaveText(String(data.length));
  });

  test('sorts assignments by due date ascending', async ({ page }) => {
    await page.goto(BASE_URL);

    const dueChips = await page.locator('.due-chip').allTextContents();
    const dates = dueChips.map((text) => new Date(text.replace('Due ', '')));
    const sorted = [...dates].sort((a, b) => a - b);
    expect(dates.map((d) => d.getTime())).toEqual(sorted.map((d) => d.getTime()));
  });

  test('shows no overdue language anywhere', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('body')).not.toContainText('overdue');
  });

  test('each subject renders with its own chip color', async ({ page }) => {
    await page.goto(BASE_URL);

    const colorsBySubject = await page.evaluate(() => {
      const map = {};
      document.querySelectorAll('.class-chip').forEach((el) => {
        map[el.dataset.subject] = getComputedStyle(el).backgroundColor;
      });
      return map;
    });

    const subjects = Object.keys(colorsBySubject);
    expect(subjects.length).toBeGreaterThan(1);
    const uniqueColors = new Set(Object.values(colorsBySubject));
    expect(uniqueColors.size).toBe(subjects.length);
  });

  test('marking an assignment complete updates the completed count', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.locator('.check-button').first().click();
    await expect(page.locator('#completedCount')).toHaveText('1');
  });

  test('class filter narrows the list to one subject', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.locator('.filter[data-filter="Math"]').click();
    const subjects = await page.locator('.class-chip').allTextContents();
    expect(subjects.every((s) => s === 'Math')).toBe(true);
  });
});
