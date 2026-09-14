import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PastePassage } from "./PastePassage";

function type(el: HTMLElement, text: string) {
  return userEvent.setup().click(el).then(() => userEvent.paste(text));
}

describe("PastePassage", () => {
  it("builds a custom snapshot from valid text", async () => {
    const onStart = vi.fn();
    render(<PastePassage onStart={onStart} />);

    await userEvent.click(screen.getByLabelText(/passage/i));
    await userEvent.paste("First clear thought. Then a second one.");
    await userEvent.click(screen.getByRole("button", { name: /start with this/i }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith({
      originalPassageId: null,
      title: "Your passage",
      author: "",
      source: "",
      year: null,
      sentences: ["First clear thought.", "Then a second one."],
      isCustom: true,
    });
  });

  it("uses a provided title", async () => {
    const onStart = vi.fn();
    render(<PastePassage onStart={onStart} />);

    await userEvent.click(screen.getByLabelText(/^title$/i));
    await userEvent.paste("My Essay");
    await userEvent.click(screen.getByLabelText(/passage/i));
    await userEvent.paste("First clear thought. Then a second one.");
    await userEvent.click(screen.getByRole("button", { name: /start with this/i }));

    expect(onStart.mock.calls[0][0]).toMatchObject({ title: "My Essay" });
  });

  it("rejects too-short text with a designed error and starts nothing", async () => {
    const onStart = vi.fn();
    render(<PastePassage onStart={onStart} />);

    await type(screen.getByLabelText(/passage/i), "Only one sentence here.");
    await userEvent.click(screen.getByRole("button", { name: /start with this/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/at least 2 sentences/i);
    expect(onStart).not.toHaveBeenCalled();
  });

  it("rejects over-cap text with the offending count and starts nothing", async () => {
    const onStart = vi.fn();
    render(<PastePassage onStart={onStart} />);

    const many = Array.from({ length: 46 }, (_, i) => `Sentence number ${i}.`).join(" ");
    await type(screen.getByLabelText(/passage/i), many);
    await userEvent.click(screen.getByRole("button", { name: /start with this/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/keep it to 40 sentences\. yours has 46\./i);
    expect(onStart).not.toHaveBeenCalled();
  });
});
