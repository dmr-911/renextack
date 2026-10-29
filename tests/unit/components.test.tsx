// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { initials } from "@/components/ui/avatar";

afterEach(cleanup);

describe("Field", () => {
  it("connects label, hint, and error to the control", () => {
    render(
      <Field label="Email" hint="We never share it." error="Enter a valid email">
        <Input name="email" />
      </Field>,
    );
    const input = screen.getByLabelText("Email");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby")!.split(" ");
    expect(describedBy.map((id) => document.getElementById(id)?.textContent)).toEqual(["We never share it.", "Enter a valid email"]);
  });

  it("omits aria-invalid when there is no error", () => {
    render(
      <Field label="Name">
        <Input name="name" />
      </Field>,
    );
    expect(screen.getByLabelText("Name").hasAttribute("aria-invalid")).toBe(false);
  });
});

describe("Button", () => {
  it("defaults to type=button so it never submits forms by accident", () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole("button", { name: "Click" }).getAttribute("type")).toBe("button");
  });

  it("is disabled and busy while loading", () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveProperty("disabled", true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });
});

describe("Alert", () => {
  it("uses role=alert for errors and role=status otherwise", () => {
    render(
      <>
        <Alert variant="error">Bad</Alert>
        <Alert variant="success">Good</Alert>
      </>,
    );
    expect(screen.getByRole("alert").textContent).toContain("Bad");
    expect(screen.getByRole("status").textContent).toContain("Good");
  });
});

describe("initials", () => {
  it("derives up to two letters", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("Cher")).toBe("C");
    expect(initials("  ")).toBe("?");
  });
});
