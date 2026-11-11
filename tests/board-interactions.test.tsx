import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useBoardPhysics } from "@/components/use-board-physics";

let nextFrame: FrameRequestCallback;
let time = 0;
function step(frames = 1) {
  act(() => { for (let i = 0; i < frames; i++) { time += 1000 / 60; nextFrame(time); } });
}
function Harness() {
  const ref = useBoardPhysics();
  return <section ref={ref}>
    <div data-left="100" data-top="100"><div data-testid="sticker" data-physics-body="" data-draggable="true" data-mass-grams="30" /></div>
    <div data-left="400" data-top="100"><div data-testid="core" data-physics-body="" data-mass-grams="1000000" /></div>
    <div data-left="-50" data-top="-40"><div data-testid="medal" data-physics-body="" data-draggable="true" data-mass-grams="120" data-tether="medal" /></div>
  </section>;
}
function pointer(el: HTMLElement, type: string, x: number, y: number) {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, { pointerId: 1, pointerType: "mouse", button: 0, clientX: x, clientY: y });
  act(() => { el.dispatchEvent(event); });
}
function offset(el: HTMLElement) {
  return el.style.transform.match(/translate3d\(([-\d.e]+)px, ([-\d.e]+)px/)!.slice(1).map(Number);
}
beforeEach(() => {
  time = 0;
  vi.stubGlobal("requestAnimationFrame", vi.fn((cb: FrameRequestCallback) => { nextFrame = cb; return 1; }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (this: HTMLElement) { return Number(this.dataset.left ?? 0); });
  vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockImplementation(function (this: HTMLElement) { return Number(this.dataset.top ?? 0); });
  for (const prop of ["offsetWidth", "offsetHeight"] as const) vi.spyOn(HTMLElement.prototype, prop, "get").mockReturnValue(80);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600);
  vi.stubGlobal("performance", { now: () => time });
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("keeps the medal top hidden under a long downward tug and springs home", () => {
  const { getByTestId } = render(<Harness />);
  const medal = getByTestId("medal");
  pointer(medal, "pointerdown", 10, 10);
  time += 16;
  pointer(medal, "pointermove", 10, 1000);
  step();
  expect(-40 + offset(medal)[1]).toBeLessThan(0);
  expect(Math.hypot(...offset(medal))).toBeLessThanOrEqual(9.61);
  pointer(medal, "pointerup", 10, 1000);
  step(180);
  expect(Math.abs(offset(medal)[1])).toBeLessThan(0.01);
});

it("clamps a drag to the viewport and settles after release", () => {
  const { getByTestId } = render(<Harness />);
  const sticker = getByTestId("sticker");
  pointer(sticker, "pointerdown", 110, 110);
  time += 16;
  pointer(sticker, "pointermove", 2000, 2000);
  step();
  expect(100 + offset(sticker)[0] + 80).toBeLessThanOrEqual(800);
  expect(100 + offset(sticker)[1] + 80).toBeLessThanOrEqual(600);
  pointer(sticker, "pointerup", 2000, 2000);
  step(240);
  const settled = offset(sticker);
  step(60);
  expect(offset(sticker)).toEqual(settled);
});

it("does not allow dragging the heavy central objects", () => {
  const { getByTestId } = render(<Harness />);
  const core = getByTestId("core");
  pointer(core, "pointerdown", 410, 110);
  pointer(core, "pointermove", 700, 400);
  pointer(core, "pointerup", 700, 400);
  step();
  expect(offset(core)).toEqual([0, 0]);
});

it("stops an overshooting drag at an obstacle, slides, and moves away immediately", () => {
  const { getByTestId } = render(<Harness />);
  const sticker = getByTestId("sticker");
  const core = getByTestId("core");
  pointer(sticker, "pointerdown", 110, 110);
  time += 16;
  pointer(sticker, "pointermove", 710, 120);
  step();
  expect(offset(sticker)[0]).toBeCloseTo(220);
  expect(offset(sticker)[1]).toBeCloseTo(10);
  expect(offset(core)).toEqual([0, 0]);
  time += 16;
  pointer(sticker, "pointermove", 750, 140);
  step(12);
  expect(offset(sticker)[0]).toBeCloseTo(220);
  expect(offset(sticker)[1]).toBeCloseTo(30);
  time += 16;
  pointer(sticker, "pointermove", 740, 140);
  step();
  expect(offset(sticker)[0]).toBeCloseTo(210);
});

it("does not launch or bounce an object released against an obstacle", () => {
  const { getByTestId } = render(<Harness />);
  const sticker = getByTestId("sticker");
  pointer(sticker, "pointerdown", 110, 110);
  time += 16;
  pointer(sticker, "pointermove", 710, 110);
  pointer(sticker, "pointerup", 710, 110);
  step(60);
  expect(offset(sticker)).toEqual([220, 0]);
});
