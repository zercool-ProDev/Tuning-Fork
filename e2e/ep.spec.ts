import { expect, test } from "@playwright/test";

import { resetEp } from "./db";

/**
 * The EP pipeline.
 *
 * The stage maths is unit tested separately. What a browser proves is that
 * moving a track records a transition event, that the rail and summary reflect
 * it, and that a repeated move does not corrupt the history.
 */

const PASSCODE = process.env.E2E_PASSCODE ?? "test-code";

test.beforeEach(async ({ page }) => {
  // These specs all mutate the same five seeded tracks, so reset per test.
  await resetEp();

  await page.goto("/login");
  await page.getByLabel("Passcode").fill(PASSCODE);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
});

test("shows the seeded release with five singles at idea", async ({ page }) => {
  await page.goto("/ep");

  await expect(page.getByRole("heading", { name: "Debut EP" })).toBeVisible();
  await expect(page.getByText("5 singles · 0 released")).toBeVisible();

  for (const title of ["Track 1", "Track 2", "Track 3", "Track 4", "Track 5"]) {
    await expect(page.getByText(title, { exact: false }).first()).toBeVisible();
  }

  // Everything at idea means 0% overall.
  await expect(page.getByText("0%").first()).toBeVisible();
});

test("advancing a track moves it and updates the pipeline", async ({ page }) => {
  await page.goto("/ep");

  // The first card's forward button goes to Writing.
  await page.getByRole("button", { name: "Writing →" }).first().click();

  await expect(page.getByText("Moved to Writing today").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Arrangement →" }).first()).toBeVisible();

  // Overall progress is now the mean: one track at 17%, four at 0% -> 3%.
  await expect(page.getByText("3%").first()).toBeVisible();

  await page.reload();
  await expect(page.getByText("Moved to Writing today").first()).toBeVisible();
});

test("going back a stage is possible", async ({ page }) => {
  await page.goto("/ep");
  await page.getByRole("button", { name: "Writing →" }).first().click();
  await expect(page.getByText("Moved to Writing today").first()).toBeVisible();

  await page.getByRole("button", { name: "← Idea" }).first().click();
  await expect(page.getByText("Moved to Idea today").first()).toBeVisible();
});

test("tapping the rail jumps straight to a stage", async ({ page }) => {
  await page.goto("/ep");

  await page.getByRole("button", { name: /Move Track 1 to Mixing/ }).click();
  await expect(page.getByText("Moved to Mixing today").first()).toBeVisible();

  // One track at mixing (67%), four at idea -> 13%.
  await expect(page.getByText("13%").first()).toBeVisible();
});

test("track details and target date persist", async ({ page }) => {
  await page.goto("/ep");

  await page.getByText("Details").first().click();
  await page.locator('input[name="title"]').first().fill("Midnight Drive");
  await page.locator('input[name="targetDate"]').first().fill("2026-09-15");
  await page.locator('textarea[name="notes"]').first().fill("Half-time feel, 82bpm");
  await page.getByRole("button", { name: "Save" }).first().click();

  await expect(page.getByText("Midnight Drive").first()).toBeVisible();
  await expect(page.getByText("Half-time feel, 82bpm").first()).toBeVisible();
  await expect(page.getByText("to target", { exact: false })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Midnight Drive").first()).toBeVisible();
});

test("adding and deleting a single", async ({ page }) => {
  await page.goto("/ep");

  await page.getByText("Add a single").click();
  const addForm = page.locator("details", { hasText: "Add a single" }).locator("form");
  await addForm.locator('input[name="title"]').fill("Bonus Cut");
  await addForm.getByRole("button", { name: "Add", exact: true }).click();

  await expect(page.getByText("Bonus Cut").first()).toBeVisible();
  await expect(page.getByText("6 singles", { exact: false })).toBeVisible();

  // Delete lives inside the track's own Details disclosure.
  const bonusCard = page.locator("section").filter({ hasText: "Bonus Cut" }).last();
  await bonusCard.getByText("Details").click();
  await bonusCard.getByRole("button", { name: /Delete Bonus Cut/ }).click();
  await expect(page.getByText("Bonus Cut")).toHaveCount(0);
  await expect(page.getByText("5 singles", { exact: false })).toBeVisible();
});

test("practice hub surfaces the EP", async ({ page }) => {
  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "EP", exact: true })).toBeVisible();
  await page.getByRole("heading", { name: "EP", exact: true }).click();
  await expect(page).toHaveURL("/ep");
});
