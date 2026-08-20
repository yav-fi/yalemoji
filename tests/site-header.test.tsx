import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "@/components/site-header";

describe("SiteHeader", () => {
  it("opens the Yale apps panel from the waffle", () => {
    render(<SiteHeader avatarUrl={null} netid="abc123" />);

    fireEvent.click(screen.getByRole("button", { name: "Yale apps" }));

    expect(screen.getByRole("link", { name: "CourseTable" })).toHaveAttribute(
      "href",
      "https://coursetable.com"
    );
    expect(screen.getByRole("link", { name: "Yalies" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Yale Meals" })).toBeInTheDocument();
  });

  it("does not render a My Library item anywhere", () => {
    render(<SiteHeader avatarUrl={null} netid="abc123" />);
    fireEvent.click(screen.getByRole("button", { name: "Profile menu" }));

    expect(screen.queryByText("My Library")).not.toBeInTheDocument();
  });

  it("opens the profile menu with the signed-in netid and a working logout link", () => {
    render(<SiteHeader avatarUrl={null} netid="abc123" />);

    fireEvent.click(screen.getByRole("button", { name: "Profile menu" }));

    expect(screen.getByText("abc123")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log out" })).toHaveAttribute(
      "href",
      "/api/auth/logout"
    );
  });

  it("renders the saved avatar image when one is provided", () => {
    render(
      <SiteHeader
        avatarUrl="https://storage.googleapis.com/yalemoji-assets/avatars/abc/1/avatar.png"
        netid="abc123"
      />
    );

    const profileButton = screen.getByRole("button", { name: "Profile menu" });
    expect(profileButton.querySelector("img")).toHaveAttribute(
      "src",
      "https://storage.googleapis.com/yalemoji-assets/avatars/abc/1/avatar.png"
    );
  });
});
