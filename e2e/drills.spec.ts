import { expect, test } from "@playwright/test";

/**
 * Drill logging and accuracy trends.
 *
 * The trend maths is unit tested separately; what only a browser can prove is
 * that the form encodes correctly, the validation rejects impossible scores,
 * and the attempt actually reaches Postgres.
 */

const PASSCODE = process.env.E2E_PASSCODE ?? "test-code";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Passcode").fill(PASSCODE);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
});

test("hub lists every seeded drill under the right domain", async ({ page }) => {
  await page.goto("/drills");

  for (const name of [
    "Intervals",
    "Triads",
    "7th Chords",
    "Chord Progressions",
    "Rhythm Dictation",
    "Melodic Dictation",
  ]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  for (const name of ["Notation Reading", "Rhythm Reading", "Chart / Lead Sheet Reading"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }

  await expect(page.getByText("Ear Training")).toBeVisible();
  await expect(page.getByText("Sight Reading")).toBeVisible();
});

test("logging an attempt records accuracy and clears the form", async ({ page }) => {
  await page.goto("/drills/intervals");
  await expect(page.getByText("No attempts logged yet", { exact: false })).toBeVisible();

  await page.locator('input[name="questionsTotal"]').fill("20");
  await page.locator('input[name="questionsCorrect"]').fill("17");
  await page.getByRole("button", { name: "Log attempt" }).click();

  // 17/20 = 85%
  await expect(page.getByText("85% overall")).toBeVisible();
  await expect(page.getByText("17/20")).toBeVisible();

  // The correct-count field resets so the next round can be typed straight in.
  await expect(page.locator('input[name="questionsCorrect"]')).toHaveValue("");

  await page.reload();
  await expect(page.getByText("85% overall")).toBeVisible();
});

test("cannot record more correct than asked", async ({ page }) => {
  await page.goto("/drills/triads");
  await page.locator('input[name="questionsTotal"]').fill("10");
  const correct = page.locator('input[name="questionsCorrect"]');
  await correct.fill("12");
  await page.getByRole("button", { name: "Log attempt" }).click();

  // The field carries max={total}, so the browser blocks the submit outright
  // and the server-side guard never has to fire. Either way nothing is stored.
  await expect(correct).toHaveJSProperty("validity.valid", false);
  await expect(page.getByText("No attempts logged yet", { exact: false })).toBeVisible();
});

test("trend appears only once there are enough attempts", async ({ page }) => {
  await page.goto("/drills/progressions");

  // Nine attempts: still not enough for two full five-attempt windows.
  for (let index = 0; index < 9; index += 1) {
    await page.locator('input[name="questionsTotal"]').fill("10");
    await page.locator('input[name="questionsCorrect"]').fill("5");
    await page.getByRole("button", { name: "Log attempt" }).click();
    await expect(page.locator('input[name="questionsCorrect"]')).toHaveValue("");
  }
  await expect(page.getByText("more attempt", { exact: false })).toBeVisible();

  // The tenth completes the comparison, and it should read as an improvement.
  await page.locator('input[name="questionsTotal"]').fill("10");
  await page.locator('input[name="questionsCorrect"]').fill("10");
  await page.getByRole("button", { name: "Log attempt" }).click();

  await expect(page.getByText("Last 5 attempts", { exact: false })).toBeVisible();
  await expect(page.getByText("recently", { exact: false })).toBeVisible();
});

test("difficulty breakdown and attempt deletion", async ({ page }) => {
  await page.goto("/drills/rhythm_dictation");

  await page.locator('input[name="questionsTotal"]').fill("10");
  await page.locator('input[name="questionsCorrect"]').fill("9");
  await page.getByRole("button", { name: "3", exact: true }).click();
  await page.getByRole("button", { name: "Log attempt" }).click();

  await expect(page.getByText("Level 3")).toBeVisible();
  await expect(page.getByText("Comfortable up to difficulty 3", { exact: false })).toBeVisible();

  // Difficulty sticks for the next attempt rather than resetting to 1.
  await expect(page.getByRole("button", { name: "3", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: /Delete attempt/ }).click();
  await expect(page.getByText("No attempts logged yet", { exact: false })).toBeVisible();
});
