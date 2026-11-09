import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateExperience } from "@/components/create-experience";
import { AvatarCanvas } from "@/components/avatar-canvas";

vi.mock("@/components/avatar-layer", () => ({
  loadAvatarSvg: vi.fn(() => Promise.resolve("<svg/>"))
}));
vi.mock("@/components/avatar-canvas", () => ({ AvatarCanvas: vi.fn(() => <div data-testid="preview" />) }));

let reducedMotion = false;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  reducedMotion = false;
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    matches: reducedMotion,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("CreateExperience", () => {
  it("starts with every app in the orbit and no referral intro or action buttons", async () => {
    const { container } = render(<CreateExperience />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(container.querySelector('[data-phase="ready"]')).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create your YaleMoji" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Your Yale apps" }).querySelectorAll("img")).toHaveLength(8);
    expect(Array.from(screen.getByRole("group", { name: "Your Yale apps" }).querySelectorAll("img"), (image) => image.alt)).toEqual([
      "CourseTable", "y/meets", "MajorAudit", "Yalies", "y/labs", "Yale Meals", "Yale Clubs", "Yale IMs"
    ]);
    expect(screen.getByRole("img", { name: "MajorAudit" })).toHaveAttribute("src", expect.stringContaining("majoraudit.webp"));
    expect(screen.queryByText(/From .* to everywhere/)).not.toBeInTheDocument();
    expect(screen.queryByText("A little more you, in every app.")).not.toBeInTheDocument();
  });

  it("reveals the white SVG wordmark one second into the ongoing blur and fade", async () => {
    const { container } = render(<CreateExperience />);
    await act(() => vi.advanceTimersByTimeAsync(9999));
    expect(container.querySelector('main[data-phase="ready"]')).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Introducing YaleMoji" })).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(container.querySelector('main[data-phase="blurring"]')).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Introducing YaleMoji" })).not.toBeInTheDocument();
    expect(screen.getByTestId("preview")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Your Yale apps" }).querySelectorAll("img")).toHaveLength(8);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(999));
    expect(screen.queryByRole("heading", { name: "Introducing YaleMoji" })).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(container.querySelector('main[data-phase="revealed"]')).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Introducing YaleMoji" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "YaleMoji" })).toHaveAttribute("src", "/assets/yalemoji.svg");
    expect(screen.getByTestId("preview")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Your Yale apps" }).querySelectorAll("img")).toHaveLength(8);
    const canvas = vi.mocked(AvatarCanvas);
    const calls = canvas.mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(150));
    expect(canvas.mock.calls.length).toBeGreaterThan(calls);
    await act(() => vi.advanceTimersByTimeAsync(2349));
    expect(screen.getByRole("heading", { name: "Introducing YaleMoji" })).toBeInTheDocument();
    expect(screen.getByTestId("preview")).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(container.querySelector('main[data-phase="finished"]')).toBeInTheDocument();
    expect(screen.queryByTestId("preview")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Your Yale apps" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Introducing YaleMoji" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "YaleMoji" })).toHaveAttribute("src", "/assets/yalemoji.svg");
    const finalCalls = canvas.mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(canvas.mock.calls.length).toBe(finalCalls);
  });

  it("changes multiple features every 150ms without an avatar backdrop", async () => {
    render(<CreateExperience />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    const canvas = vi.mocked(AvatarCanvas);
    const initial = canvas.mock.calls.at(-1)![0];
    await act(() => vi.advanceTimersByTimeAsync(149));
    expect(canvas.mock.calls.at(-1)![0].selections).toEqual(initial.selections);
    await act(() => vi.advanceTimersByTimeAsync(1));
    const updated = canvas.mock.calls.at(-1)![0];
    expect(updated.selections.hair).not.toEqual(initial.selections.hair);
    expect(updated.selections.eyes).not.toEqual(initial.selections.eyes);
    expect(updated.hairPalette.id).not.toEqual(initial.hairPalette.id);
    expect(screen.getByRole("img", { name: "A YaleMoji cycling through different looks" })).not.toHaveAttribute("style");
  });

  it("avoids rapid changes for reduced motion", async () => {
    reducedMotion = true;
    const { container } = render(<CreateExperience />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    const canvas = vi.mocked(AvatarCanvas);
    const initial = canvas.mock.calls.at(-1)![0];
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(container.querySelector('[data-phase="ready"]')).toBeInTheDocument();
    expect(canvas.mock.calls.at(-1)![0]).toEqual(initial);
  });
});
