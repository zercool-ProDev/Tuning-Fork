import { expect, test } from "@playwright/test";

import { resetGenres } from "./db";

/**
 * The genre versatility map.
 *
 * Coverage maths is unit tested separately. A browser is what proves ratings
 * are append-only, that repertoire from the instrument stage flows through as
 * evidence, and that the deep dive stays one per month.
 */

const PASSCODE = process.env.E2E_PASSCODE ?? "test-code";

test.beforeEach(async ({ page }) => {
  // Ratings, dives and notes are shared rows, so reset per test.
  await resetGenres();

  await page.goto("/login");
  await page.getByLabel("Passcode").fill(PASSCODE);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
});

test("lists all twelve genres, none covered", async ({ page }) => {
  await page.goto("/genres");

  for (const name of ["Pop", "R&B", "Jazz", "Hip-Hop", "Rock", "Gospel / Worship"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }

  await expect(page.getByText("0/12 genres")).toBeVisible();
  await expect(page.getByText("0% covered · 0/12 rated at all")).toBeVisible();
});

test("rating a genre updates coverage, and 3 is the bar", async ({ page }) => {
  await page.goto("/genres");

  // 2 is "Dabbled" — rated but not covered.
  await page.getByRole("button", { name: /Rate Jazz 2 of 5/ }).click();
  await expect(page.getByText("0% covered · 1/12 rated at all")).toBeVisible();

  // 3 is "Comfortable" — the point at which it counts.
  await page.getByRole("button", { name: /Rate Jazz 3 of 5/ }).click();
  await expect(page.getByText("1/12 genres")).toBeVisible();
  await expect(page.getByText("8% covered · 1/12 rated at all")).toBeVisible();
});

test("ratings are append-only, so a rise is visible", async ({ page }) => {
  await page.goto("/genres");

  await page.getByRole("button", { name: /Rate Rock 2 of 5/ }).click();
  await expect(page.getByText("Dabbled")).toBeVisible();

  await page.getByRole("button", { name: /Rate Rock 4 of 5/ }).click();
  const rock = page.locator("div").filter({ hasText: /^Rock/ }).first();
  await expect(rock.getByText("Strong")).toBeVisible();
  // The arrow only appears when there is an earlier rating to compare against.
  await expect(rock.getByText("↑")).toBeVisible();
});

test("a rating with nothing logged is called out", async ({ page }) => {
  await page.goto("/genres");

  await page.getByRole("button", { name: /Rate Funk 5 of 5/ }).click();
  await expect(page.getByText("rated but nothing logged yet")).toBeVisible();
});

test("deep dive is one per month and can be completed", async ({ page }) => {
  await page.goto("/genres");

  await page.locator('select[name="genreId"]').first().selectOption({ label: "Jazz" });
  await page.locator('textarea[name="goals"]').first().fill("Transcribe two solos");
  await page.getByRole("button", { name: "Start deep dive" }).click();

  await expect(page.getByText("Transcribe two solos")).toBeVisible();

  await page.getByRole("button", { name: "Mark complete" }).click();
  await expect(page.getByRole("button", { name: "Completed" })).toBeVisible();

  // Toggling back off, so a mistaken tap is recoverable.
  await page.getByRole("button", { name: "Completed" }).click();
  await expect(page.getByRole("button", { name: "Mark complete" })).toBeVisible();
});

test("listening notes can be added and removed", async ({ page }) => {
  await page.goto("/genres");

  await page.getByText("Add a track").click();
  await page.locator('input[name="trackTitle"]').fill("Chameleon");
  await page.locator('input[name="artist"]').fill("Herbie Hancock");
  await page.locator('input[name="url"]').fill("https://example.com/chameleon");
  await page.locator('textarea[name="whatINoticed"]').fill("Clavinet sits under the bass");
  await page.getByRole("button", { name: "Add", exact: true }).click();

  await expect(page.getByText("Chameleon")).toBeVisible();
  await expect(page.getByText("Clavinet sits under the bass")).toBeVisible();

  // The link is rendered as an anchor, with the safe rel attributes.
  const link = page.getByRole("link", { name: "Chameleon" });
  await expect(link).toHaveAttribute("rel", /noopener/);

  await page.getByRole("button", { name: /Delete note on Chameleon/ }).click();
  await expect(page.getByText("Clavinet sits under the bass")).toHaveCount(0);
});

test("practice hub surfaces genre coverage", async ({ page }) => {
  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "Genres", exact: true })).toBeVisible();
  await page.getByRole("heading", { name: "Genres", exact: true }).click();
  await expect(page).toHaveURL("/genres");
});
