import { StrictMode } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeferredHeadingFont } from "@/components/deferred-heading-font";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

const addFont = vi.fn();
const loadFont = vi.fn();
const fontFace = vi.fn(function () {
  return { family: "National Park", load: loadFont };
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  localStorage.clear();
  navigation.pathname = "/";
  loadFont.mockResolvedValue({ family: "National Park" });
  vi.stubGlobal("FontFace", fontFace);
  vi.spyOn(document, "readyState", "get").mockReturnValue("complete");
  Object.defineProperty(document, "fonts", { configurable: true, value: { add: addFont } });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DeferredHeadingFont", () => {
  it("does not request the font on the first page, even in Strict Mode", async () => {
    render(<StrictMode><DeferredHeadingFont /></StrictMode>);

    await act(() => vi.runAllTimersAsync());

    expect(fontFace).not.toHaveBeenCalled();
    expect(localStorage.getItem("yalemoji:visited")).toBe("true");
  });

  it("loads the self-hosted variable font in the background on the second navigation", async () => {
    const view = render(<DeferredHeadingFont />);
    navigation.pathname = "/about";
    view.rerender(<DeferredHeadingFont />);

    expect(fontFace).not.toHaveBeenCalled();
    await act(() => vi.runAllTimersAsync());

    expect(fontFace).toHaveBeenCalledWith("National Park", "url(/fonts/national-park.ttf)", {
      display: "swap", style: "normal", weight: "200 800"
    });
    expect(addFont).toHaveBeenCalledWith(expect.objectContaining({ family: "National Park" }));

    navigation.pathname = "/updates";
    view.rerender(<DeferredHeadingFont />);
    await act(() => vi.runAllTimersAsync());
    expect(fontFace).toHaveBeenCalledTimes(1);
  });

  it("loads on a returning visit after the page finishes loading", async () => {
    localStorage.setItem("yalemoji:visited", "true");
    vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    render(<StrictMode><DeferredHeadingFont /></StrictMode>);

    await act(() => vi.runAllTimersAsync());
    expect(fontFace).not.toHaveBeenCalled();

    act(() => window.dispatchEvent(new Event("load")));
    await act(() => vi.runAllTimersAsync());
    expect(loadFont).toHaveBeenCalledTimes(1);
  });

  it("uses an idle callback when supported", async () => {
    localStorage.setItem("yalemoji:visited", "true");
    const idle = vi.fn();
    vi.stubGlobal("requestIdleCallback", idle);
    vi.stubGlobal("cancelIdleCallback", vi.fn());
    render(<DeferredHeadingFont />);

    expect(idle).toHaveBeenCalledWith(expect.any(Function), { timeout: 2000 });
    expect(fontFace).not.toHaveBeenCalled();
    await act(async () => idle.mock.calls[0][0]());
    expect(addFont).toHaveBeenCalledTimes(1);
  });

  it("still loads on navigation when storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked"); });
    const view = render(<DeferredHeadingFont />);
    navigation.pathname = "/editor";
    view.rerender(<DeferredHeadingFont />);

    await act(() => vi.runAllTimersAsync());
    expect(addFont).toHaveBeenCalledTimes(1);
  });
});
