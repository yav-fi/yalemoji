import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "@/components/site-header";

describe("SiteHeader", () => {
  it("opens the Yale apps panel from the waffle", () => {
    render(<SiteHeader avatarBackgroundUrl={null} avatarUrl={null} netid="abc123" />);

    fireEvent.click(screen.getByRole("button", { name: "Yale apps" }));

    expect(screen.getByRole("link", { name: "CourseTable" })).toHaveAttribute(
      "href",
      "https://coursetable.com"
    );
    expect(screen.getByRole("link", { name: "Yalies" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "YaleMeals" })).toBeInTheDocument();
  });

  it("does not render a My Library item anywhere", () => {
    render(<SiteHeader avatarBackgroundUrl={null} avatarUrl={null} netid="abc123" />);
    fireEvent.click(screen.getByRole("button", { name: "Profile menu" }));

    expect(screen.queryByText("My Library")).not.toBeInTheDocument();
  });

  it("shows About, Updates, and logout without a greeting or NetID", () => {
    render(<SiteHeader avatarBackgroundUrl={null} avatarUrl={null} netid="abc123" />);

    fireEvent.click(screen.getByRole("button", { name: "Profile menu" }));

    const dropdownId = screen.getByRole("button", { name: "Profile menu" }).getAttribute("aria-controls")!;
    const menu = within(document.getElementById(dropdownId)!);
    expect(menu.queryByText(/Hello,/)).not.toBeInTheDocument();
    expect(menu.queryByText("abc123")).not.toBeInTheDocument();
    expect(menu.queryByRole("link", { name: "Editor" })).not.toBeInTheDocument();
    expect(menu.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(menu.getByRole("link", { name: "Updates" })).toHaveAttribute("href", "/updates");
    expect(screen.getByRole("link", { name: "Log out" })).toHaveAttribute(
      "href",
      "/api/auth/logout"
    );
  });

  it("renders the saved avatar face image when one is provided", () => {
    render(
      <SiteHeader
        avatarBackgroundUrl={null}
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

  it("layers the background SVG behind the face in both the button and the open dropdown", () => {
    const backgroundUrl = "https://storage.googleapis.com/yalemoji-assets/avatars/abc/1/background.svg";
    const avatarUrl = "https://storage.googleapis.com/yalemoji-assets/avatars/abc/1/avatar.png";

    render(<SiteHeader avatarBackgroundUrl={backgroundUrl} avatarUrl={avatarUrl} netid="abc123" />);

    const profileButton = screen.getByRole("button", { name: "Profile menu" });
    const buttonImages = profileButton.querySelectorAll("img");
    expect(buttonImages).toHaveLength(2);
    expect(buttonImages[0]).toHaveAttribute("src", backgroundUrl);
    expect(buttonImages[1]).toHaveAttribute("src", avatarUrl);

    fireEvent.click(profileButton);
    const dropdownId = profileButton.getAttribute("aria-controls")!;
    const identityHeader = document.getElementById(dropdownId)!.firstElementChild!;
    const dropdownImages = identityHeader.querySelectorAll("img");
    expect(dropdownImages).toHaveLength(2);
    expect(dropdownImages[0]).toHaveAttribute("src", backgroundUrl);
    expect(dropdownImages[1]).toHaveAttribute("src", avatarUrl);
  });
});
