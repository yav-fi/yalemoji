import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvatarEditor } from "@/components/avatar-editor";
import { normalizeAvatarSvg } from "@/components/avatar-layer";

describe("AvatarEditor", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows colors for face and hair but not feature categories", () => {
    render(<AvatarEditor />);

    expect(screen.getByRole("group", { name: "Face color" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Eyes" }));
    expect(screen.queryByRole("group", { name: /color/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Hair" }));
    expect(screen.getByRole("group", { name: "Hair color" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Select color/ })).toHaveLength(13);
  });

  it("moves backward and forward through the feature tabs", () => {
    render(<AvatarEditor />);

    const back = screen.getByRole("button", { name: "Back" });
    const next = screen.getByRole("button", { name: "Next" });
    expect(back).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Face" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(next);
    expect(screen.getByRole("tab", { name: "Hair" })).toHaveAttribute("aria-selected", "true");
    expect(back).toBeEnabled();

    fireEvent.click(back);
    expect(screen.getByRole("tab", { name: "Face" })).toHaveAttribute("aria-selected", "true");

    for (let step = 0; step < 6; step += 1) fireEvent.click(next);
    expect(screen.getByRole("tab", { name: "Background" })).toHaveAttribute("aria-selected", "true");
    expect(next).toBeDisabled();
  });

  it("starts as a gray face and reveals the fixed features after customization", () => {
    const { container } = render(<AvatarEditor />);

    expect(container.querySelector('[data-active="false"]')).toBeInTheDocument();
    expect(container.querySelector('[data-avatar-layer="nose"]')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Select color 1" }));

    expect(container.querySelector('[data-active="true"]')).toBeInTheDocument();
    expect(container.querySelector('[data-avatar-layer="nose"]')).toBeInTheDocument();
    expect(container.querySelector('[data-category="brows"]')).toBeInTheDocument();
  });

  it("applies both halves of a selected hair style", () => {
    const { container } = render(<AvatarEditor />);

    fireEvent.click(screen.getByRole("tab", { name: "Hair" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Hair 1" }));

    expect(container.querySelector('[data-avatar-layer="hair-back"]')).toBeInTheDocument();
    expect(container.querySelector('[data-avatar-layer="hair-front"]')).toBeInTheDocument();
  });

  it("previews hair around the selected face", () => {
    const { container } = render(<AvatarEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Select Face 2" }));
    fireEvent.click(screen.getByRole("tab", { name: "Hair" }));

    const firstHair = screen.getByRole("button", { name: "Select Hair 1" });
    expect(firstHair.querySelector('[data-preview-layer="hair-back"]')).toBeInTheDocument();
    expect(firstHair.querySelector('[data-preview-layer="face"]')).toHaveAttribute("data-avatar-option", "face-2");
    expect(firstHair.querySelector('[data-preview-layer="hair-front"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Hair options"]')).toBeInTheDocument();
  });

  it("wires the numbered accessory options", () => {
    const { container } = render(<AvatarEditor />);

    fireEvent.click(screen.getByRole("tab", { name: "Accessories" }));
    expect(screen.getAllByRole("button", { name: /Select Accessory/ })).toHaveLength(22);
    fireEvent.click(screen.getByRole("button", { name: "Select Accessory 22" }));
    expect(container.querySelector('[data-category="accessories"]')).toBeInTheDocument();
  });

  it("renders solid colors and preset gradient backgrounds", () => {
    const { container } = render(<AvatarEditor />);

    fireEvent.click(screen.getByRole("tab", { name: "Background" }));
    expect(screen.getByRole("group", { name: "Background color" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Background gradient" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /background/ })).toHaveLength(18);

    fireEvent.click(screen.getByRole("button", { name: "Select Mint background" }));
    let background = container.querySelector('[data-avatar-layer="background"]');
    expect(background).toHaveAttribute("data-background-option", "solid-4");
    expect(background?.getAttribute("style")).not.toContain("gradient");

    fireEvent.click(screen.getByRole("button", { name: "Select Pink and yellow gradient background" }));
    background = container.querySelector('[data-avatar-layer="background"]');
    expect(background).toHaveAttribute("data-background-option", "gradient-1");
    expect(background).toHaveAttribute("style", expect.stringContaining("linear-gradient"));
  });

  it("makes exported layers transparent and maps skin colors to palette slots", () => {
    const svg = '<svg><rect width="502" height="502" fill="white"/><path fill="#C4C4C4" stroke="#676767"/></svg>';
    const normalized = normalizeAvatarSvg("/avatar/face/1.svg", svg);

    expect(normalized).not.toContain("<rect");
    expect(normalized).toContain("var(--avatar-primary)");
    expect(normalized).toContain("var(--avatar-secondary)");
  });

  it("keeps clipping-mask geometry while removing an SVG background", () => {
    const svg = [
      '<svg><g clip-path="url(#clip)">',
      '<rect width="502" height="502" fill="white"/>',
      '<path fill="#515151"/>',
      '</g><defs><clipPath id="clip">',
      '<rect width="502" height="502" fill="white"/>',
      '</clipPath></defs></svg>'
    ].join("");
    const normalized = normalizeAvatarSvg("/avatar/hair-front/5.svg", svg);

    expect(normalized.match(/<rect/g)).toHaveLength(1);
    expect(normalized).toContain('<clipPath id="clip"><rect');
  });

  it("maps hair fills and outlines to the selected hair palette", () => {
    const svg = '<svg><path fill="#515151"/><path fill="#676767" stroke="black"/></svg>';
    const normalized = normalizeAvatarSvg("/avatar/hair-front/1.svg", svg);

    expect(normalized.match(/var\(--avatar-primary\)/g)).toHaveLength(2);
    expect(normalized).toContain('stroke="var(--avatar-secondary)"');
  });
});
