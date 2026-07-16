import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "@/components/site-header";

describe("SiteHeader", () => {
  it("opens the Yale apps panel from the waffle", () => {
    render(<SiteHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Yale apps" }));

    expect(screen.getByRole("link", { name: "CourseTable" })).toHaveAttribute(
      "href",
      "https://coursetable.com"
    );
    expect(screen.getByRole("link", { name: "Yalies" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Yale Meals" })).toBeInTheDocument();
  });

  it("opens the profile menu without linking My Library", () => {
    render(<SiteHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Profile menu" }));

    expect(screen.getByText("Yavin’s YaleMoji")).toBeInTheDocument();
    expect(screen.getAllByText("My Library")).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "My Library" })).not.toBeInTheDocument();
  });
});
