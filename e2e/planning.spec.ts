import { expect, test } from "@playwright/test";

import { resetPlanning, resetPracticeLinks } from "./db";

/**
 * Stage 9: the weekly planner, the roadmap, and the goal metric that rolls up
 * onto the dashboard. Plus the practice link on drills, which is the other half
 * of the "drill elsewhere, log here" loop.
 */

const PASSCODE = process.env.E2E_PASSCODE ?? "test-code";

/**
 * Add a milestone to a quarter.
 *
 * The <details> keeps its open state across the server action's re-render, so
 * clicking the summary a second time would close it. Set `open` directly
 * instead of toggling.
 */
async function addMilestone(page: import("@playwright/test").Page, quarter: string, title: string) {
  const card = page.locator("section", { hasText: `Add a milestone to ${quarter}` }).last();
  const details = card.locator("details", { hasText: `Add a milestone to ${quarter}` });
  await details.evaluate((element: HTMLDetailsElement) => {
    element.open = true;
  });
  await details.locator('input[name="title"]').fill(title);
  await details.getByRole("button", { name: "Add milestone" }).click();
  await expect(page.getByText(title)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  // Per test, not per run: these specs share the plan and milestone rows, and
  // a suite that only passes in order is worse than no suite.
  await resetPlanning();
  await resetPracticeLinks();

  await page.goto("/login");
  await page.getByLabel("Passcode").fill(PASSCODE);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
});

test("plan targets fill in from logged sessions", async ({ page }) => {
  await page.goto("/practice/planner");
  await expect(page.getByText("No plan for this week yet")).toBeVisible();

  await page.locator('select[name="domain"]').selectOption("theory");
  await page.locator('input[name="targetMinutes"]').fill("60");
  await page.getByRole("button", { name: "Add target" }).click();

  // Nothing logged yet, so the target reads zero against its goal.
  await expect(page.getByText("— / 1h")).toBeVisible();

  // Log 30 minutes of theory today; the plan should pick it up automatically.
  await page.goto("/log");
  await page.locator('select[name="segment.0.domain"]').selectOption("theory");
  await page.locator('input[name="segment.0.minutes"]').fill("30");
  await page.getByRole("button", { name: "Save session" }).click();
  await expect(page).toHaveURL(/saved=1/);

  await page.goto("/practice/planner");
  await expect(page.getByText("30m / 1h")).toBeVisible();
});

test("milestones drive the goal percentage on the dashboard", async ({ page }) => {
  await page.goto("/practice/roadmap");
  await expect(page.getByText("no milestones yet").or(page.getByText("0%")).first()).toBeVisible();

  // Two milestones of equal weight: completing one is 50%.
  await addMilestone(page, "Q1", "Learn four grooves");
  await addMilestone(page, "Q1", "ii-V-I in all keys");

  // Advance the first from pending to in progress to done.
  const row = page.locator("li", { hasText: "Learn four grooves" });
  await row.getByRole("button", { name: "Pending" }).click();
  await row.getByRole("button", { name: "In progress" }).click();
  await expect(row.getByRole("button", { name: "Done" })).toBeVisible();

  await expect(page.getByText("50%").first()).toBeVisible();

  // And it surfaces on the dashboard.
  await page.goto("/");
  await expect(page.getByText("Progress to 12-month goal")).toBeVisible();
  await expect(page.getByText("1/2 milestones")).toBeVisible();
  await expect(page.getByText("50%").first()).toBeVisible();
});

test("a dropped milestone leaves the denominator", async ({ page }) => {
  await page.goto("/practice/roadmap");
  await addMilestone(page, "Q1", "Kept goal");
  await addMilestone(page, "Q2", "Abandoned goal");

  await expect(page.getByText("0/2 milestones")).toBeVisible();

  const row = page.locator("li", { hasText: "Abandoned goal" });
  await row.getByRole("button", { name: /Drop Abandoned goal/ }).click();

  // Dropping leaves the denominator rather than counting as incomplete forever,
  // so abandoning a goal cannot permanently cap the number below 100%.
  await expect(page.getByText("0/1 milestones")).toBeVisible();
});

test("drills link out to musictheory.net and the link is editable", async ({ page }) => {
  await page.goto("/drills/intervals");

  const link = page.getByRole("link", { name: /Practice this drill/ });
  await expect(link).toHaveAttribute("href", /musictheory\.net/);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);

  // The URL is data, so a wrong link is an edit rather than a deploy.
  await page.getByText("Change practice link").click();
  await page.locator('input[name="practiceUrl"]').fill("https://www.musictheory.net/exercises/ear-interval");
  await page.locator('input[name="practiceLabel"]').fill("Interval Ear Training");
  await page.getByRole("button", { name: "Save link" }).click();

  await expect(page.getByRole("link", { name: /Practice this drill/ })).toHaveAttribute(
    "href",
    "https://www.musictheory.net/exercises/ear-interval",
  );
  await page.reload();
  await expect(page.getByText("Interval Ear Training")).toBeVisible();
});

test("a javascript: practice link is rejected", async ({ page }) => {
  await page.goto("/drills/triads");
  await page.getByText("Change practice link").click();

  // type=url blocks this in the browser, so submit it the way an attacker would.
  await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('input[name="practiceUrl"]');
    if (input) {
      input.type = "text";
      input.value = "javascript:alert(1)";
    }
  });
  await page.getByRole("button", { name: "Save link" }).click();

  // Stored as null rather than becoming a stored XSS vector in an anchor.
  await expect(page.getByText("No practice link set for this drill yet")).toBeVisible();
});
