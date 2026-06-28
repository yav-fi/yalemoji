import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WaitlistForm } from "@/components/waitlist-form";

describe("WaitlistForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the email form", () => {
    render(<WaitlistForm />);

    expect(screen.getByPlaceholderText("Your Yale email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join Waitlist" })).toBeInTheDocument();
  });

  it("validates Yale email addresses before posting", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<WaitlistForm />);

    fireEvent.change(screen.getByPlaceholderText("Your Yale email"), {
      target: { value: "person@example.com" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Join Waitlist" }));

    expect(await screen.findByText("Use your @yale.edu email address.")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows success after a valid submission", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    } as Response);
    render(<WaitlistForm />);

    fireEvent.change(screen.getByPlaceholderText("Your Yale email"), {
      target: { value: "person@yale.edu" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Join Waitlist" }));

    await waitFor(() => {
      expect(screen.getByText("You're on the waitlist.")).toBeInTheDocument();
    });
  });

  it("shows a rate limit message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "rate_limited", retryAfterSeconds: 120 })
    } as Response);
    render(<WaitlistForm />);

    fireEvent.change(screen.getByPlaceholderText("Your Yale email"), {
      target: { value: "person@yale.edu" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Join Waitlist" }));

    await waitFor(() => {
      expect(screen.getByText("Too many attempts. Try again in 2 min.")).toBeInTheDocument();
    });
  });
});
