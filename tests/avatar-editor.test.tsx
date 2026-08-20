import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvatarEditor } from "@/components/avatar-editor";
import { normalizeAvatarSvg } from "@/lib/avatar-svg";

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

  it("uses direct feature tabs and keeps export available", () => {
    render(<AvatarEditor />);

    expect(screen.getByRole("tab", { name: "Face" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Hair" }));
    expect(screen.getByRole("tab", { name: "Hair" })).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("button", { name: "Download PNG with background" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download transparent PNG" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save avatar" })
    ).toBeInTheDocument();
  });

  it("starts with the selected face and fixed nose, then toggles features", () => {
    const { container } = render(<AvatarEditor />);

    expect(container.querySelector('[data-active="true"]')).toBeInTheDocument();
    expect(container.querySelector('[data-avatar-layer="nose"]')).toBeInTheDocument();
    expect(container.querySelector('[data-category="brows"]')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Eyebrows" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Eyebrows 1" }));
    expect(container.querySelector('[data-category="brows"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Select Eyebrows 1" }));
    expect(container.querySelector('[data-category="brows"]')).not.toBeInTheDocument();
  });

  it("applies both halves of a selected hair style", () => {
    const { container } = render(<AvatarEditor />);

    fireEvent.click(screen.getByRole("tab", { name: "Hair" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Hair 1" }));

    expect(container.querySelector('[data-avatar-layer="hair-back"]')).toBeInTheDocument();
    expect(container.querySelector('[data-avatar-layer="hair-front"]')).toBeInTheDocument();
  });

  it("previews both halves of each hair style", () => {
    const { container } = render(<AvatarEditor />);

    fireEvent.click(screen.getByRole("tab", { name: "Hair" }));

    const firstHair = screen.getByRole("button", { name: "Select Hair 1" });
    expect(firstHair.querySelector('[data-preview-layer="hair-back"]')).toBeInTheDocument();
    expect(firstHair.querySelector('[data-preview-layer="hair-front"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Hair options"]')).toBeInTheDocument();
  });

  it("groups accessories into independent wearable slots", () => {
    const { container } = render(<AvatarEditor />);

    fireEvent.click(screen.getByRole("tab", { name: "Accessories" }));
    expect(screen.getByRole("heading", { name: "Eyewear" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "College Crest" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Select Eyewear/ })).toHaveLength(4);
    expect(screen.getAllByRole("button", { name: /Select College crest/ })).toHaveLength(15);

    fireEvent.click(screen.getByRole("button", { name: "Select Eyewear 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Cheeks 1" }));
    expect(container.querySelector('[data-avatar-layer="eyewear"]')).toBeInTheDocument();
    expect(container.querySelector('[data-avatar-layer="cheeks"]')).toBeInTheDocument();
  });

  it("renders solid, gradient, and pattern backgrounds", () => {
    const { container } = render(<AvatarEditor />);

    fireEvent.click(screen.getByRole("tab", { name: "Background" }));
    expect(screen.getByRole("group", { name: "Background solid" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Background gradient" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Background pattern" })).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /^Select .* background$/ })
    ).toHaveLength(35);

    fireEvent.click(
      within(screen.getByRole("group", { name: "Background solid" })).getByRole(
        "button",
        { name: "Select Mint background" }
      )
    );
    let background = container.querySelector('[data-avatar-layer="background"]');
    expect(background).toHaveAttribute("data-background-option", "solid-4");
    expect(background?.getAttribute("style")).not.toContain("gradient");

    fireEvent.click(screen.getByRole("button", { name: "Select Tie Dye background" }));
    background = container.querySelector('[data-avatar-layer="background"]');
    expect(background).toHaveAttribute("data-background-option", "gradient-tie-dye");
  });

  it("makes exported layers transparent and maps skin colors to palette slots", () => {
    const svg = '<svg><rect width="502" height="502" fill="white"/><path fill="#C4C4C4" stroke="#676767"/></svg>';
    const normalized = normalizeAvatarSvg("/yalemoji/Face/Face_1.svg", svg);

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
    const normalized = normalizeAvatarSvg("/yalemoji/Hairs/5-front.svg", svg);

    expect(normalized.match(/<rect/g)).toHaveLength(1);
    expect(normalized).toContain('<clipPath id="clip"><rect');
  });

  it("maps hair fills and outlines to the selected hair palette", () => {
    const svg = '<svg><path fill="#515151"/><path fill="#676767" stroke="black"/></svg>';
    const normalized = normalizeAvatarSvg("/yalemoji/Hairs/1-front.svg", svg);

    expect(normalized.match(/var\(--avatar-primary\)/g)).toHaveLength(2);
    expect(normalized).toContain('stroke="var(--avatar-secondary)"');
  });

  it("saves by posting the current config to the server and shows the returned version", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === "/api/avatar") {
          expect(init?.method).toBe("POST");
          const body = JSON.parse(String(init?.body));
          expect(body).toHaveProperty("selections");
          expect(body).toHaveProperty("skinPaletteId");
          expect(body).toHaveProperty("backgroundId");
          return Promise.resolve(
            new Response(JSON.stringify({ version: 3, pngUrl: "x", svgUrl: "y" }), {
              status: 200
            })
          );
        }
        return new Promise<Response>(() => {});
      })
    );

    render(<AvatarEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Save avatar" }));

    expect(await screen.findByText("Saved (v3)")).toBeInTheDocument();
  });

  it("shows a friendly message when saving is rate limited", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        if (String(input) === "/api/avatar") {
          return Promise.resolve(
            new Response(JSON.stringify({ error: "rate_limited", retryAfterSeconds: 120 }), {
              status: 429
            })
          );
        }
        return new Promise<Response>(() => {});
      })
    );

    render(<AvatarEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Save avatar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("2 minute(s)");
  });
});
