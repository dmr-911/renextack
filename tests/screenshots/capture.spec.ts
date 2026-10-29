import { test, type Page } from "@playwright/test";

const out = (name: string) => `docs/screenshots/${name}.png`;

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
}

async function signInAsDemo(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("demo@launchstack.dev");
  await page.getByLabel("Password").fill("demo-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard$/);
}

test("public pages", async ({ page }) => {
  await setTheme(page, "light");
  await page.goto("/");
  await page.screenshot({ path: out("landing"), fullPage: false });
  await page.goto("/sign-in");
  await page.screenshot({ path: out("sign-in") });
  await page.goto("/components");
  await page.screenshot({ path: out("components"), fullPage: true });
});

for (const theme of ["light", "dark"] as const) {
  test(`app (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await signInAsDemo(page);
    await page.getByTestId("stat-open-tasks").waitFor();
    await page.screenshot({ path: out(`dashboard-${theme}`) });
    if (theme === "light") {
      await page.goto("/dashboard/projects");
      await page.getByRole("table").waitFor();
      await page.screenshot({ path: out("projects") });
      await page.getByRole("link", { name: "Website relaunch" }).click();
      await page.getByRole("list", { name: "Tasks" }).waitFor();
      await page.screenshot({ path: out("project-detail") });
      await page.goto("/dashboard/settings");
      await page.getByRole("list", { name: "Active sessions" }).waitFor();
      await page.screenshot({ path: out("settings"), fullPage: true });
    }
  });
}

test("mobile", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await setTheme(page, "light");
  await signInAsDemo(page);
  await page.getByTestId("stat-open-tasks").waitFor();
  await page.screenshot({ path: out("mobile-dashboard") });
  await page.getByRole("button", { name: "Open app menu" }).click();
  await page.getByRole("dialog", { name: "App menu" }).waitFor();
  await page.screenshot({ path: out("mobile-menu") });
  await context.close();
});
