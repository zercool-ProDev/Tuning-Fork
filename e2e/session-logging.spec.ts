import { expect, test } from "@playwright/test";

/**
 * End-to-end coverage of the logging loop: sign in, log a multi-domain session,
 * see it listed, edit it, delete it.
 *
 * This exercises the server actions, which no unit test reaches — the form
 * encoding, the segment index parsing and the cascade on delete only really
 * happen when a browser submits the form.
 */

const PASSCODE = process.env.E2E_PASSCODE ?? "test-code";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Passcode").fill(PASSCODE);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
});

test("logs a two-domain session, then edits and deletes it", async ({ page }) => {
  await expect(page.getByText("Nothing logged yet")).toBeVisible();

  await page.getByRole("link", { name: "Log a session" }).first().click();
  await expect(page).toHaveURL("/log");

  // First block: 30 minutes of drums.
  await page.locator('select[name="segment.0.domain"]').selectOption("instrument");
  await page.locator('input[name="segment.0.minutes"]').fill("30");
  await page.locator('select[name="segment.0.instrumentId"]').selectOption({ label: "Drums" });
  await page.locator('textarea[name="segment.0.notes"]').fill("Paradiddles at 90bpm");

  // Second block in the same sitting: 15 minutes of ear training.
  await page.getByRole("button", { name: "+ Add another block" }).click();
  await page.locator('select[name="segment.1.domain"]').selectOption("ear_training");
  await page.locator('input[name="segment.1.minutes"]').fill("15");

  await page.getByLabel("What worked").fill("Hands felt even");
  await page.getByLabel("Focus next time").fill("Try 100bpm");

  await page.getByRole("button", { name: "Save session" }).click();
  await expect(page).toHaveURL(/\/sessions\?saved=1/);

  // Both blocks appear on one session card, i.e. one sitting, two domains.
  await expect(page.getByText("Session saved.")).toBeVisible();
  await expect(page.getByText("Paradiddles at 90bpm")).toBeVisible();
  await expect(page.getByText("Hands felt even")).toBeVisible();
  await expect(page.getByText("45m")).toBeVisible();

  // The dashboard totals should now reflect it.
  await page.getByRole("link", { name: "Today" }).click();
  await expect(page.locator("text=45m").first()).toBeVisible();

  // Edit: change the drum block to 40 minutes.
  await page.getByRole("link", { name: "All sessions" }).click();
  await page.getByRole("link", { name: "Edit" }).first().click();
  await page.locator('input[name="segment.0.minutes"]').fill("40");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/sessions\?saved=1/);
  await expect(page.getByText("55m")).toBeVisible();

  // Delete, and confirm the list empties.
  await page.getByRole("link", { name: "Edit" }).first().click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/sessions\?deleted=1/);
  await expect(page.getByText("No sessions yet")).toBeVisible();
});

test("rejects a session with no practice blocks", async ({ page }) => {
  await page.goto("/log");
  // The first block defaults to Instrument, so clear it to leave nothing valid.
  await page.locator('select[name="segment.0.domain"]').selectOption("");
  await page.getByRole("button", { name: "Save session" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("at least one practice block");
});

test("rejects a block with no minutes", async ({ page }) => {
  await page.goto("/log");
  await page.locator('select[name="segment.0.domain"]').selectOption("theory");
  await page.getByRole("button", { name: "Save session" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("some minutes");
});
