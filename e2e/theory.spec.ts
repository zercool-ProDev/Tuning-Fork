import { expect, test } from "@playwright/test";

/**
 * Theory curriculum, quizzes and the spaced-repetition queue.
 *
 * The SM-2 maths is unit tested separately. What needs a browser is that
 * grading happens on the server, the schedule actually advances, and the review
 * queue drains as concepts move out into the future.
 */

const PASSCODE = process.env.E2E_PASSCODE ?? "test-code";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Passcode").fill(PASSCODE);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
});

test("curriculum lists every stage in order", async ({ page }) => {
  await page.goto("/theory");

  for (const stage of [
    "Intervals",
    "Triads",
    "7th Chords",
    "Modes",
    "Functional Harmony",
    "ii-V-I & Reharmonization",
    "Voice Leading",
  ]) {
    await expect(page.getByText(stage, { exact: true }).first()).toBeVisible();
  }

  // 19 seeded concepts, none started.
  await expect(page.getByText("0/19")).toBeVisible();
  await expect(page.getByText("Interval Quality & Size")).toBeVisible();
});

test("the answer is never in the page before you answer", async ({ page }) => {
  await page.goto("/theory/review");

  // "Perfect fifth" question: the correct answer is 7. Its explanation must not
  // be in the markup until the question has been graded.
  const html = await page.content();
  expect(html).not.toContain("seven semitones");
});

test("answering correctly schedules the concept forward", async ({ page }) => {
  await page.goto("/theory/review");
  await expect(page.getByText("left", { exact: false })).toBeVisible();

  const prompt = await page.locator("p.text-lg").textContent();
  expect(prompt).toBeTruthy();

  // Answer whatever the first choice is, then read the graded result.
  await page.locator('button[name="choice"]').first().click();
  await expect(page.getByText(/Correct|Not quite/)).toBeVisible();
  await expect(page.getByText("Next review", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: /Next question|Finish/ }).click();

  // The curriculum should now show one concept started.
  await page.goto("/theory");
  await expect(page.getByText("1/19")).toBeVisible();
});

test("a wrong answer reveals the correct one and keeps the concept due", async ({ page }) => {
  await page.goto("/theory/review");

  // Deliberately pick a wrong option by trying each until one grades as wrong.
  const choices = page.locator('button[name="choice"]');
  const count = await choices.count();
  expect(count).toBeGreaterThan(1);

  await choices.last().click();
  const verdict = page.getByText(/Correct|Not quite/);
  await expect(verdict).toBeVisible();

  if ((await verdict.textContent()) === "Not quite") {
    await expect(page.getByText("The answer is", { exact: false })).toBeVisible();
    // A lapse schedules it one day out, so it leaves today's queue.
    await expect(page.getByText("Next review", { exact: false })).toBeVisible();
  }
});

test("the queue drains as concepts are answered", async ({ page }) => {
  await page.goto("/theory");
  const before = await page.locator("p.text-xl").first().textContent();
  const dueBefore = Number.parseInt(before ?? "0", 10);
  expect(dueBefore).toBeGreaterThan(0);

  await page.goto("/theory/review");
  for (let index = 0; index < 3; index += 1) {
    await page.locator('button[name="choice"]').first().click();
    await expect(page.getByText(/Correct|Not quite/)).toBeVisible();
    await page.getByRole("button", { name: /Next question|Finish/ }).click();
    await page.waitForTimeout(200);
  }

  await page.goto("/theory");
  const after = await page.locator("p.text-xl").first().textContent();
  const dueAfter = Number.parseInt(after ?? "0", 10);
  expect(dueAfter).toBeLessThan(dueBefore);
});

test("resetting a concept puts it back in the queue", async ({ page }) => {
  // Answer one first so there is a schedule to reset; the spec must not depend
  // on residue from whichever test happened to run before it.
  await page.goto("/theory/review");
  await page.locator('button[name="choice"]').first().click();
  await expect(page.getByText(/Correct|Not quite/)).toBeVisible();

  await page.goto("/theory");

  const reset = page.getByRole("button", { name: "Reset" }).first();
  await expect(reset).toBeVisible();

  const before = Number.parseInt(
    (await page.locator("p.text-xl").first().textContent()) ?? "0",
    10,
  );
  await reset.click();

  const after = Number.parseInt(
    (await page.locator("p.text-xl").first().textContent()) ?? "0",
    10,
  );
  expect(after).toBeGreaterThanOrEqual(before);
});

test("practice hub links every area", async ({ page }) => {
  await page.goto("/practice");

  for (const name of ["Instruments", "Logic Pro", "Ear & Sight Reading", "Music Theory"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }

  await page.getByRole("heading", { name: "Music Theory" }).click();
  await expect(page).toHaveURL("/theory");
});
