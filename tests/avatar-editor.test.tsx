import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvatarEditor } from "@/components/avatar-editor";
import { defaultConfig, type AvatarConfig } from "@/lib/avatar-config";
import { writeDraft } from "@/lib/avatar-draft";
import { normalizeAvatarSvg } from "@/lib/avatar-svg";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const beachDay: { version: number; name: string; config: AvatarConfig } = {
  version: 4,
  name: "Beach day",
  config: {
    ...defaultConfig,
    // Saved before color sliders existed: no slider positions.
    selections: { ...defaultConfig.selections, eyes: "eyes-2", mouth: "mouth-1", brows: null }
  }
};

function selectEyesAndMouth() {
  fireEvent.click(screen.getByRole("tab", { name: "Eyes" }));
  fireEvent.click(screen.getByRole("button", { name: "Select Eyes 1" }));
  fireEvent.click(screen.getByRole("tab", { name: "Mouth" }));
  fireEvent.click(screen.getByRole("button", { name: "Select Mouth 1" }));
}

describe("AvatarEditor", () => {
  beforeEach(() => {
    refresh.mockClear();
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows colors for face and hair but not feature categories", () => {
    render(<AvatarEditor />);

    expect(screen.getByRole("group", { name: "Face color" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Eyes" }));
    expect(screen.queryByRole("group", { name: /color/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Hair" }));
    expect(screen.getByRole("group", { name: "Hair color" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Select color/ })).not.toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Hair color" })).toBeInTheDocument();
  });

  it("blends skin and hair colors live and retains slider positions across tabs", () => {
    const { container } = render(<AvatarEditor />);
    const canvas = () => container.querySelector('[data-active="true"][style]') as HTMLElement;
    const skin = screen.getByRole("slider", { name: "Skin color" });
    fireEvent.change(skin, { target: { value: "0.5" } });
    expect(canvas().style.getPropertyValue("--avatar-primary")).toBe("#f9d9c4");
    expect(canvas().style.getPropertyValue("--avatar-secondary")).toBe("#f2a475");
    fireEvent.click(screen.getByRole("tab", { name: "Hair" }));
    fireEvent.change(screen.getByRole("slider", { name: "Hair color" }), { target: { value: "0.5" } });
    expect(canvas().style.getPropertyValue("--avatar-hair-primary")).toBe("#3d312c");
    fireEvent.click(screen.getByRole("tab", { name: "Face" }));
    expect(screen.getByRole("slider", { name: "Skin color" })).toHaveValue("0.5");
    fireEvent.click(screen.getByRole("tab", { name: "Hair" }));
    expect(screen.getByRole("slider", { name: "Hair color" })).toHaveValue("0.5");
    fireEvent.change(screen.getByRole("slider", { name: "Hair color" }), { target: { value: "5" } });
    expect(screen.getByRole("slider", { name: "Hair color" })).toHaveValue("5");
    expect(canvas().style.getPropertyValue("--avatar-hair-primary")).toBe("#a85433");
  });

  it.each(["finish", "next"] as const)("keeps the current tab open and spins only the clicked %s control until saving finishes", async (source) => {
    let resolveSave!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => String(input) === "/api/avatar"
      ? new Promise<Response>((resolve) => { resolveSave = resolve; }) : new Promise<Response>(() => {})));
    render(<AvatarEditor />);
    if (source === "next") fireEvent.click(screen.getByRole("tab", { name: "Background" }));
    const initialTab = source === "next" ? "Background" : "Face";
    const trigger = source === "next" ? screen.getByRole("button", { name: "Next" }) : screen.getByRole("tab", { name: "Finish" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-busy", "true");
    expect(within(trigger).getByRole("status", { name: "Saving your Yalemoji" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: initialTab })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Finish" })).toHaveAttribute("aria-selected", "false");
    expect(screen.queryByRole("link", { name: "Done" })).not.toBeInTheDocument();
    await act(async () => { resolveSave(new Response(JSON.stringify({ version: 1 }), { status: 200 })); });
    expect(screen.getByRole("heading", { name: "Your Yalemoji has been set!" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PNG with background" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download transparent PNG" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Done" })).toHaveAttribute("href", "https://yalemoji.com");
    expect(screen.getByRole("tab", { name: "Finish" })).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("tab", { name: "Finish" }).querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Saving your Yalemoji" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: "Next" })).toHaveTextContent("Next");
  });

  it("navigates every step with Next and Back and saves when Next reaches the final step", async () => {
    localStorage.clear();
    render(<AvatarEditor localPreview />);
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
    for (const label of ["Eyes", "Eyebrows", "Mouth", "Hair", "Accessories", "Background"]) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(screen.getByRole("tab", { name: label })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    }
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Next" })); });
    expect(screen.getByRole("tab", { name: "Finish" })).toHaveAttribute("aria-selected", "true");
    await screen.findByRole("heading", { name: "Your Yalemoji has been set!" });
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("tab", { name: "Background" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("tab", { name: "Accessories" })).toHaveAttribute("aria-selected", "true");
    localStorage.clear();
  });

  it("starts with the selected face and fixed nose, then toggles features", () => {
    const { container } = render(<AvatarEditor />);

    expect(container.querySelector('[data-active="true"]')).toBeInTheDocument();
    expect(container.querySelector('[data-avatar-layer="nose"]')).toBeInTheDocument();
    expect(container.querySelector('[data-category="brows"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Eyebrows" }));
    expect(screen.getByRole("button", { name: "Select Eyebrows 6" })).toHaveAttribute("aria-pressed", "true");
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

  it("automatically saves and sets the exact design on entry, without saving it twice", async () => {
    const requests: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/avatar") {
        requests.push(JSON.parse(String(init?.body)));
        return Promise.resolve(new Response(JSON.stringify({ version: requests.length }), { status: 200 }));
      }
      return new Promise<Response>(() => {});
    }));
    render(<AvatarEditor />);
    fireEvent.change(screen.getByRole("slider", { name: "Skin color" }), { target: { value: "0.51" } });
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: "Finish" })); });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ setAsCurrent: true, skinColorPosition: 0.51 });
    await screen.findByRole("heading", { name: "Your Yalemoji has been set!" });
    expect(refresh).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("tab", { name: "Face" }));
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: "Finish" })); });
    expect(requests).toHaveLength(1);
    fireEvent.click(screen.getByRole("tab", { name: "Face" }));
    fireEvent.change(screen.getByRole("slider", { name: "Skin color" }), { target: { value: "0.75" } });
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: "Finish" })); });
    await screen.findByRole("heading", { name: "Your Yalemoji has been set!" });
    expect(requests).toHaveLength(2);
    expect(requests[1]).toMatchObject({ setAsCurrent: true, skinColorPosition: 0.75 });
    expect(refresh).toHaveBeenCalledTimes(2);
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
    selectEyesAndMouth();
    fireEvent.click(screen.getByRole("tab", { name: "Finish" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("2 minute(s)");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("starts with basic eyes and mouth, keeps them selected, and allows replacements", () => {
    const { container } = render(<AvatarEditor />);
    expect(container.querySelector('[data-category="eyes"]')).toBeInTheDocument();
    expect(container.querySelector('[data-category="mouth"]')).toBeInTheDocument();
    for (const label of ["Eyes", "Mouth"]) {
      fireEvent.click(screen.getByRole("tab", { name: label }));
      const first = screen.getByRole("button", { name: `Select ${label} 1` });
      expect(first).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(first);
      expect(first).toHaveAttribute("aria-pressed", "true");
      const second = screen.getByRole("button", { name: `Select ${label} 2` });
      fireEvent.click(second);
      fireEvent.click(second);
      expect(second).toHaveAttribute("aria-pressed", "true");
      expect(first).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("fills in missing eyes and mouth when restoring an older draft", () => {
    localStorage.clear();
    const first = render(<AvatarEditor netid="old-draft" />);
    fireEvent.click(screen.getByRole("tab", { name: "Hair" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Hair 1" }));
    first.unmount();
    const key = "yalemoji:draft:v1:old-draft";
    const draft = JSON.parse(localStorage.getItem(key)!);
    draft.config.selections.eyes = null;
    draft.config.selections.mouth = null;
    localStorage.setItem(key, JSON.stringify(draft));
    const restored = render(<AvatarEditor netid="old-draft" />);
    expect(restored.container.querySelector('[data-category="eyes"]')).toBeInTheDocument();
    expect(restored.container.querySelector('[data-category="mouth"]')).toBeInTheDocument();
    expect(restored.container.querySelector('[data-avatar-layer="hair-front"]')).toBeInTheDocument();
    restored.unmount();
    localStorage.clear();
  });

  it("shows the server's message when it rejects an incomplete avatar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) =>
        String(input) === "/api/avatar"
          ? Promise.resolve(
              new Response(JSON.stringify({ error: "incomplete_avatar", missing: ["mouth"] }), {
                status: 400
              })
            )
          : new Promise<Response>(() => {})
      )
    );

    render(<AvatarEditor />);
    selectEyesAndMouth();
    fireEvent.click(screen.getByRole("tab", { name: "Finish" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Add a mouth before saving."
    );
  });

  it("restores unsaved edits for the same netid after a reload", () => {
    localStorage.clear();
    const first = render(<AvatarEditor netid="abc123" />);
    fireEvent.click(screen.getByRole("tab", { name: "Eyebrows" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Eyebrows 1" }));
    first.unmount();

    const { container } = render(<AvatarEditor netid="abc123" />);
    expect(container.querySelector('[data-category="brows"]')).toBeInTheDocument();
    expect(screen.queryByText("Restored your unsaved edits")).not.toBeInTheDocument();
    localStorage.clear();
  });

  it("does not show another netid's draft", () => {
    localStorage.clear();
    const first = render(<AvatarEditor netid="abc123" />);
    fireEvent.click(screen.getByRole("tab", { name: "Eyebrows" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Eyebrows 1" }));
    first.unmount();

    const { container } = render(<AvatarEditor netid="xyz789" />);
    expect(container.querySelector('[data-category="brows"]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Eyebrows" }));
    expect(screen.getByRole("button", { name: "Select Eyebrows 6" })).toHaveAttribute("aria-pressed", "true");
    localStorage.clear();
  });

  it("saves a local preview on this device without calling the avatar API", async () => {
    localStorage.clear();
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const first = render(<AvatarEditor localPreview />);
    selectEyesAndMouth();
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: "Finish" }));
    });
    await screen.findByRole("heading", { name: "Your Yalemoji has been set!" });
    expect(fetchMock).not.toHaveBeenCalledWith("/api/avatar", expect.anything());
    expect(refresh).not.toHaveBeenCalled();
    first.unmount();
    const second = render(<AvatarEditor localPreview />);
    expect(second.container.querySelector('[data-category="eyes"]')).toBeInTheDocument();
    expect(second.container.querySelector('[data-category="mouth"]')).toBeInTheDocument();
    second.unmount();
    localStorage.clear();
  });

  describe("opening a saved design", () => {
    // The address is cleared with history.replaceState, not router.replace: a
    // router navigation would re-render the page and remount the editor.
    let replaceState: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      localStorage.clear();
      // As if opened from the Designs page, arriving with a login ?ref.
      window.history.pushState(null, "", "/editor?design=4&ref=yalies");
      replaceState = vi.spyOn(window.history, "replaceState");
    });
    afterEach(() => {
      localStorage.clear();
      replaceState.mockRestore();
      window.history.pushState(null, "", "/");
    });

    it("shows the design and only clears the address on the first edit", () => {
      writeDraft("abc123", { ...defaultConfig, selections: { ...defaultConfig.selections, hair: "hair-1" } });
      const { container } = render(<AvatarEditor initialDesign={beachDay} netid="abc123" />);
      // Opening isn't an edit: the stored draft is untouched until one.
      act(() => void 0);
      expect(JSON.parse(localStorage.getItem("yalemoji:draft:v1:abc123")!).config.selections.hair).toBe("hair-1");

      expect(container.querySelector('[data-category="eyes"]')).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("Opened 'Beach day'");
      // The different stored draft was backed up, so it's offered back.
      expect(screen.getByRole("button", { name: "Bring back previous edits" })).toBeInTheDocument();
      expect(replaceState).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("tab", { name: "Eyebrows" }));
      expect(replaceState).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Select Eyebrows 1" }));
      expect(replaceState).toHaveBeenCalledTimes(1);
      // Only ?design is dropped; the path and other parameters are kept.
      expect(replaceState).toHaveBeenCalledWith(null, "", "/editor?ref=yalies");

      fireEvent.click(screen.getByRole("button", { name: "Select Eyebrows 2" }));
      expect(replaceState).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("tab", { name: "Eyebrows" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("status")).toHaveTextContent("Opened 'Beach day'");
    });

    it("offers to bring back the edits that were replaced", () => {
      writeDraft("abc123", {
        ...defaultConfig,
        selections: { ...defaultConfig.selections, brows: "brows-1" }
      });

      const { container } = render(<AvatarEditor initialDesign={beachDay} netid="abc123" />);
      expect(container.querySelector('[data-category="brows"]')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Bring back previous edits" }));
      expect(container.querySelector('[data-category="brows"]')).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Bring back previous edits" })
      ).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("Brought back your previous edits");
    });

    it("keeps its state when the page re-renders without ?design after Save", () => {
      // After the first edit the address has no ?design, so router.refresh()
      // renders the page's other branch. Both use key="editor", so React must
      // keep this instance rather than remount it.
      const { container, rerender } = render(
        <AvatarEditor initialDesign={beachDay} key="editor" netid="abc123" />
      );
      fireEvent.click(screen.getByRole("tab", { name: "Eyebrows" }));
      fireEvent.click(screen.getByRole("button", { name: "Select Eyebrows 1" }));

      rerender(<AvatarEditor designNotFound={false} key="editor" netid="abc123" />);

      expect(screen.getByRole("tab", { name: "Eyebrows" })).toHaveAttribute("aria-selected", "true");
      expect(container.querySelector('[data-category="brows"]')).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("Opened 'Beach day'");
    });

    function recordFetches(respond: (url: string) => Response) {
      const urls: string[] = [];
      vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        urls.push(url);
        return Promise.resolve(respond(url));
      }));
      return urls;
    }
    const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

    it("makes an unchanged opened design current instead of saving a copy", async () => {
      const urls = recordFetches(() => ok({ version: 4 }));
      render(<AvatarEditor initialDesign={beachDay} netid="abc123" />);

      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: "Finish" })); });

      await screen.findByRole("heading", { name: "Your Yalemoji has been set!" });
      expect(urls).toEqual(["/api/designs/4/current"]);
      expect(refresh).toHaveBeenCalledOnce();
    });

    it("saves a new design once the opened design has been changed", async () => {
      const urls = recordFetches(() => ok({ version: 5 }));
      render(<AvatarEditor initialDesign={beachDay} netid="abc123" />);
      fireEvent.change(screen.getByRole("slider", { name: "Skin color" }), { target: { value: "0.75" } });

      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: "Finish" })); });

      await screen.findByRole("heading", { name: "Your Yalemoji has been set!" });
      expect(urls).toEqual(["/api/avatar"]);
    });

    it("saves it as a new design if it was removed since it was opened", async () => {
      const urls = recordFetches((url) =>
        url === "/api/avatar" ? ok({ version: 5 }) : new Response(null, { status: 404 })
      );
      render(<AvatarEditor initialDesign={beachDay} netid="abc123" />);

      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: "Finish" })); });

      await screen.findByRole("heading", { name: "Your Yalemoji has been set!" });
      expect(urls).toEqual(["/api/designs/4/current", "/api/avatar"]);
    });

    it("says when the design couldn't be found and clears the address", () => {
      render(<AvatarEditor designNotFound netid="abc123" />);

      expect(screen.getByRole("status")).toHaveTextContent("That design couldn't be found.");
      expect(replaceState).toHaveBeenCalledWith(null, "", "/editor?ref=yalies");
    });
  });
});
