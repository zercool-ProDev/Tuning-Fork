import { expect, test } from "@playwright/test";

/**
 * Dashboard behaviour that only shows up once real sessions exist: the streak
 * counting a fresh log, the heatmap grid, and the focus editor round-tripping
 * through the settings row.
 */

const PASSCODE = process.env.E2E_PASSCODE ?? "test-code";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Passcode").fill(PASSCODE);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
});

test("streak and today's total react to a logged session", async ({ page }) => {
  await page.goto("/log");
  await page.locator('select[name="segment.0.domain"]').selectOption("theory");
  await page.locator('input[name="segment.0.minutes"]').fill("35");
  await page.getByRole("button", { name: "Save session" }).click();
  await expect(page).toHaveURL(/saved=1/);

  await page.goto("/");

  const streakTile = page.locator("p", { hasText: /^day streak$/ }).locator("..");
  await expect(streakTile).toContainText("1");

  const todayTile = page.locator("p", { hasText: /^today$/ }).locator("..");
  await expect(todayTile).toContainText("35m");

  // Not asserting the target percentage here: the focus test below changes the
  // weekly target, and coupling these two would make the pair order-dependent.
  await expect(page.getByText("Music Theory").first()).toBeVisible();

  // Leave the log as we found it so the suite has no hidden ordering.
  await page.goto("/sessions");
  await page.getByRole("link", { name: "Edit" }).first().click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/deleted=1/);
});

test("heatmap renders a full grid with a legend", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Consistency")).toBeVisible();
  await expect(page.getByText("Less")).toBeVisible();
  await expect(page.getByText("More")).toBeVisible();

  // 27 weeks x 7 days, minus any future days this week, plus 5 legend swatches.
  const cells = page.locator(".rounded-\\[3px\\]");
  const count = await cells.count();
  expect(count).toBeGreaterThan(180);
  expect(count).toBeLessThanOrEqual(194);
});

test("focus and weekly target persist", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Focus & weekly target").click();

  await page.locator('input[name="currentFocus"]').fill("Ghost notes and ii-V-I");
  await page.locator('input[name="weeklyMinutesTarget"]').fill("600");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Ghost notes and ii-V-I")).toBeVisible();
  await expect(page.getByText("of 10h")).toBeVisible();

  // Survives a reload, i.e. it is in Postgres and not component state.
  await page.reload();
  await expect(page.getByText("Ghost notes and ii-V-I")).toBeVisible();
});
