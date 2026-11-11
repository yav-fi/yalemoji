import { readFile } from "node:fs/promises";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AvatarCategoryIcon } from "@/components/avatar-category-icon";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete (SVGElement.prototype as unknown as { getBBox?: unknown }).getBBox;
});

it.each(["face", "hair"] as const)("renders the real first %s artwork with visible silhouette fills", async (category) => {
  vi.stubGlobal("fetch", vi.fn(async (src: string) => new Response(await readFile(`${process.cwd()}/public${src}`, "utf8"))));
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 50, y: 40, width: 400, height: 350 })
  });
  const { container } = render(<AvatarCategoryIcon category={category} />);
  await waitFor(() => expect(container.querySelector("g path")).toBeInTheDocument());
  const artwork = container.querySelector("g")!.innerHTML;
  expect(artwork).not.toContain("var(--avatar-");
  expect(artwork).toContain('fill="#000000"');
  expect(container.querySelector("svg")!.getAttribute("viewBox")).not.toBe("0 0 502 502");
  expect(container.querySelector("feComposite")).toHaveAttribute("in2", "SourceAlpha");
  expect(container.querySelector("feFlood")).toHaveAttribute("flood-color", "currentColor");
});
