import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SiteHeader } from "@/components/site-header";
import { SAVED_AVATAR_STORAGE_KEY } from "@/lib/saved-avatar";

describe("SiteHeader", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("opens the Yale apps panel from the waffle", () => {
    render(<SiteHeader netid="abc123" />);

    fireEvent.click(screen.getByRole("button", { name: "Yale apps" }));

    expect(screen.getByRole("link", { name: "CourseTable" })).toHaveAttribute(
      "href",
      "https://coursetable.com"
    );
    expect(screen.getByRole("link", { name: "Yalies" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Yale Meals" })).toBeInTheDocument();
  });

  it("opens the profile menu without linking My Library", () => {
    render(<SiteHeader netid="abc123" />);

    fireEvent.click(screen.getByRole("button", { name: "Profile menu" }));

    expect(screen.getByText("abc123")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log out" })).toHaveAttribute(
      "href",
      "/api/auth/logout"
    );
    expect(screen.getAllByText("My Library")).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "My Library" })).not.toBeInTheDocument();
  });

  it("composites a saved transparent avatar over its stored background", async () => {
    const imageDataUrl = "data:image/png;base64,iVBORw0KGgo=";
    window.localStorage.setItem(
      SAVED_AVATAR_STORAGE_KEY,
      JSON.stringify({
        backgroundId: "solid-4",
        imageDataUrl,
        savedAt: "2026-07-19T00:00:00.000Z"
      })
    );

    render(<SiteHeader netid="abc123" />);
    const profileButton = screen.getByRole("button", { name: "Profile menu" });

    await waitFor(() =>
      expect(profileButton.querySelector("img")).toHaveAttribute(
        "src",
        imageDataUrl
      )
    );
    expect(profileButton).toHaveAttribute(
      "style",
      expect.stringContaining("background")
    );

    fireEvent.click(profileButton);
    expect(screen.getByText("abc123").parentElement).toHaveAttribute(
      "data-saved",
      "true"
    );
  });
});
