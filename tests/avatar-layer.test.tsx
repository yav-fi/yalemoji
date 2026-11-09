import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AvatarLayer } from "@/components/avatar-layer";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (SVGElement.prototype as unknown as { getBBox?: unknown }).getBBox;
});

it("keeps fitted feature previews the same size after selecting an option", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response('<svg viewBox="0 0 502 502"><path d="M100 100h100v20H100z"/></svg>')));
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 100, y: 100, width: 100, height: 20 })
  });
  function Preview() {
    const [selected, setSelected] = useState(false);
    return <button aria-label="Select mouth" aria-pressed={selected} onClick={() => setSelected(!selected)}><AvatarLayer fit src="/test-mouth-preview.svg" /></button>;
  }
  const { container } = render(<Preview />);
  await waitFor(() => expect(container.querySelector("svg")).toHaveAttribute("viewBox", "88 48 124 124"));
  fireEvent.click(screen.getByRole("button", { name: "Select mouth" }));
  expect(container.querySelector("svg")).toHaveAttribute("viewBox", "88 48 124 124");
  fireEvent.click(screen.getByRole("button", { name: "Select mouth" }));
  expect(container.querySelector("svg")).toHaveAttribute("viewBox", "88 48 124 124");
});
