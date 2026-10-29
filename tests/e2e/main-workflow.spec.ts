import { expect, test } from "@playwright/test";
import { latestResetToken } from "./db";

const unique = Date.now();
const user = { name: "Erin Example", email: `erin-${unique}@e2e.test`, password: "erin-password-123" };

test.describe.configure({ mode: "serial" });

test("redirects signed-out visitors from the dashboard to sign-in", async ({ page }) => {
  await page.goto("/dashboard/projects");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard%2Fprojects/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("sign up, create a project, manage tasks, see the dashboard update, sign out", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard\?welcome=1/);
  await expect(page.getByRole("heading", { name: "Hi, Erin" })).toBeVisible();
  await expect(page.getByText("No activity yet")).toBeVisible();
  await expect(page.getByTestId("stat-active-projects")).toHaveText("0");

  // Create a project from the modal.
  await page.getByRole("link", { name: "New project" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New project" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Name").fill("Launch plan");
  await dialog.getByLabel("Description").fill("Everything for launch day");
  await dialog.getByRole("button", { name: "Create project" }).click();

  await expect(page.getByRole("heading", { name: "Launch plan" })).toBeVisible();
  await expect(page.getByText("No tasks yet")).toBeVisible();

  // Add two tasks.
  const addTask = page.getByRole("form", { name: "Add task" });
  for (const title of ["Write announcement", "Record demo video"]) {
    await addTask.getByLabel("Task").fill(title);
    await addTask.getByRole("button", { name: "Add task" }).click();
    await expect(page.getByRole("list", { name: "Tasks" }).getByText(title)).toBeVisible();
  }

  // Complete one.
  await page.getByRole("checkbox", { name: "Mark “Write announcement” as done" }).check();
  await expect(page.getByRole("checkbox", { name: "Mark “Write announcement” as not done" })).toBeChecked();
  await expect(page.getByText("1 open of 2 tasks")).toBeVisible();

  // The cached dashboard reflects the change immediately (tag invalidation).
  await page.getByRole("navigation", { name: "App" }).getByRole("link", { name: "Overview" }).click();
  await expect(page.getByTestId("stat-active-projects")).toHaveText("1");
  await expect(page.getByTestId("stat-open-tasks")).toHaveText("1");
  await expect(page.getByTestId("stat-completed-this-week")).toHaveText("1");
  await expect(page.getByRole("list", { name: "Recent activity" }).getByText("Completed “Write announcement”")).toBeVisible();

  // Search and filter the project list.
  await page.goto("/dashboard/projects?q=launch");
  await expect(page.getByRole("link", { name: "Launch plan" })).toBeVisible();
  await page.goto("/dashboard/projects?q=nothing-matches");
  await expect(page.getByText("No matching projects")).toBeVisible();

  // Regular users can't use the admin area, even by typing the URL.
  await page.goto("/dashboard/admin/users");
  await expect(page.getByRole("heading", { name: "Administrators only" })).toBeVisible();

  // Sign out.
  await page.getByRole("button", { name: `Account menu for ${user.name}` }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("reset a forgotten password and sign in with the new one", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(user.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();

  const token = await latestResetToken();
  await page.goto(`/reset-password?token=${token}`);
  await page.getByLabel("New password", { exact: true }).fill("erin-new-password-456");
  await page.getByLabel("Confirm new password").fill("erin-new-password-456");
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page).toHaveURL(/\/sign-in\?reset=1/);

  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill("erin-new-password-456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Hi, Erin" })).toBeVisible();
});

test("admin can open the user directory and see other users' projects read-only", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("admin@launchstack.dev");
  await page.getByLabel("Password").fill("demo-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Users" }).click();
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await expect(page.getByRole("cell", { name: user.email })).toBeVisible();

  await page.goto("/dashboard/projects?scope=all&q=Launch+plan");
  await page.getByRole("link", { name: "Launch plan" }).click();
  await expect(page.getByText("Read-only")).toBeVisible();
  await expect(page.getByRole("form", { name: "Add task" })).toHaveCount(0);
});

test("theme toggle switches to dark mode and persists", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Change color theme" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
