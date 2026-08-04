import { expect, test } from "@playwright/test";

/**
 * The skill-tree engine, exercised through the one route that serves all five
 * trees. The interactions are server actions, so only a real browser submit
 * proves the status cycling, repertoire and fluency writes actually land.
 */

const PASSCODE = process.env.E2E_PASSCODE ?? "test-code";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Passcode").fill(PASSCODE);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
});

test("one route renders all five trees", async ({ page }) => {
  await page.goto("/skills");
  for (const name of ["Drums", "Bass", "Guitar", "Keys", "Logic Pro"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }

  // Instrument trees carry repertoire and fluency; the Logic tree does not.
  await page.goto("/skills/drums");
  await expect(page.getByText("Skill tree")).toBeVisible();
  await expect(page.getByText("Repertoire")).toBeVisible();
  await expect(page.getByText("Fluency")).toBeVisible();

  await page.goto("/skills/logic");
  await expect(page.getByText("Skill tree")).toBeVisible();
  await expect(page.getByText("Project log")).toBeVisible();
  await expect(page.getByText("Repertoire")).toHaveCount(0);
});

test("skill status cycles and persists", async ({ page }) => {
  await page.goto("/skills/drums");

  const skill = page.getByRole("button", { name: /Grip & Posture/ });
  await expect(skill).toHaveAttribute("aria-label", /Not started/);

  await skill.click();
  await expect(page.getByRole("button", { name: /Grip & Posture/ })).toHaveAttribute(
    "aria-label",
    /Working on it/,
  );

  await page.getByRole("button", { name: /Grip & Posture/ }).click();
  await expect(page.getByRole("button", { name: /Grip & Posture/ })).toHaveAttribute(
    "aria-label",
    /— Done/,
  );

  // Survives a reload, so it is in Postgres rather than component state.
  await page.reload();
  await expect(page.getByRole("button", { name: /Grip & Posture/ })).toHaveAttribute(
    "aria-label",
    /— Done/,
  );

  // And the hub's counter reflects it. Matched loosely on purpose: pinning the
  // node count would break this test every time the tree gains content.
  await page.goto("/skills");
  await expect(page.getByText(/1\/\d+ skills/)).toBeVisible();

  // Cycle back to not started so the suite leaves no residue.
  await page.goto("/skills/drums");
  await page.getByRole("button", { name: /Grip & Posture/ }).click();
  await expect(page.getByRole("button", { name: /Grip & Posture/ })).toHaveAttribute(
    "aria-label",
    /Not started/,
  );
});

test("repertoire can be added, advanced and removed", async ({ page }) => {
  await page.goto("/skills/guitar");
  await page.getByText("Add a song").click();

  await page.locator('input[name="title"]').fill("Isn't She Lovely");
  await page.locator('input[name="artist"]').fill("Stevie Wonder");
  await page.locator('select[name="difficulty"]').selectOption("3");
  await page.getByRole("button", { name: "Add song" }).click();

  await expect(page.getByText("Isn't She Lovely")).toBeVisible();
  await expect(page.getByText("Stevie Wonder", { exact: false })).toBeVisible();

  // Learning -> Performable -> Polished.
  await page.getByRole("button", { name: "Learning" }).click();
  await expect(page.getByRole("button", { name: "Performable" })).toBeVisible();
  await page.getByRole("button", { name: "Performable" }).click();
  await expect(page.getByRole("button", { name: "Polished" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Polished" })).toBeVisible();

  await page.getByRole("button", { name: /Remove Isn't She Lovely/ }).click();
  await expect(page.getByText("Isn't She Lovely")).toHaveCount(0);
});

test("fluency rating records a trend", async ({ page }) => {
  await page.goto("/skills/keys");
  await expect(page.getByText("Not rated yet")).toBeVisible();

  await page.getByRole("button", { name: "4", exact: true }).click();
  await expect(page.getByText("4/10")).toBeVisible();

  await page.getByRole("button", { name: "6", exact: true }).click();
  await expect(page.getByText("6/10")).toBeVisible();
  // Two ratings on the same day still read as a rise, not an overwrite.
  await expect(page.getByText("+2 since", { exact: false })).toBeVisible();

  await page.goto("/skills");
  await expect(page.getByText("6/10")).toBeVisible();
});

test("logic projects can be added and linked to an EP track", async ({ page }) => {
  await page.goto("/skills/logic");
  await page.getByText("Add a project").click();

  await page.locator('input[name="name"]').fill("Verse beat sketch");
  await page.locator('select[name="epTrackId"]').selectOption({ label: "Track 1" });
  await page.locator('textarea[name="notes"]').fill("Parallel compression on the drum bus");
  await page.getByRole("button", { name: "Add project" }).click();

  await expect(page.getByText("Verse beat sketch")).toBeVisible();
  await expect(page.getByText("EP · Track 1")).toBeVisible();
  await expect(page.getByText("Parallel compression on the drum bus")).toBeVisible();

  await page.getByRole("button", { name: /Remove Verse beat sketch/ }).click();
  await expect(page.getByText("Verse beat sketch")).toHaveCount(0);
});

test("tiers are named and the tree suggests what is next", async ({ page }) => {
  await page.goto("/skills/drums");

  // Named stages rather than "Tier 3", which says nothing about level.
  for (const name of ["Foundations", "Developing", "Fluent", "Advanced", "Professional", "Mastery"]) {
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  }

  // The nudge points at the lowest unfinished tier.
  await expect(page.getByText(/Next up · Foundations/)).toBeVisible();

  // Once something is in progress it is preferred over starting another thing.
  await page.getByRole("button", { name: /Basic Rock Beat/ }).click();
  await expect(page.getByText("Basic Rock Beat").last()).toBeVisible();
});

test("a fully cleared tree says something useful instead of sitting at 100%", async ({ page }) => {
  await page.goto("/skills/drums");

  // Clear every skill by cycling each to done.
  for (let pass = 0; pass < 2; pass += 1) {
    const buttons = page.locator('form button[aria-label*="—"]');
    const count = await buttons.count();
    for (let i = 0; i < count; i += 1) {
      const button = page.locator('form button[aria-label*="—"]').nth(i);
      const label = await button.getAttribute("aria-label");
      if (label && !label.includes("— Done")) await button.click();
    }
  }

  await expect(page.getByText("Every tier cleared.")).toBeVisible();
  await expect(page.getByText(/repertoire that demands these skills/)).toBeVisible();
  await expect(page.getByText(/Next up/)).toHaveCount(0);
});
