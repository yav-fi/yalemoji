import { describe, expect, it } from "vitest";
import { applyFriction, collide, confine, type BoardBody } from "@/lib/board-physics";

function body(overrides: Partial<BoardBody> = {}): BoardBody {
  return { x: 0, y: 0, width: 20, height: 20, vx: 0, vy: 0, mass: 30, held: false, ...overrides };
}

describe("landing board physics", () => {
  it("transfers momentum by mass and loses kinetic energy in a collision", () => {
    const a = body({ vx: 100 });
    const b = body({ x: 19, mass: 60, vx: -50 });
    collide(a, b);
    expect(a.mass * a.vx + b.mass * b.vx).toBeCloseTo(0);
    expect(b.vx).toBeGreaterThan(0);
    expect(a.mass * a.vx ** 2 + b.mass * b.vx ** 2).toBeLessThan(450000);
    expect(a.x + a.width - b.x).toBeLessThanOrEqual(0.011);
  });

  it.each([false, true])("leaves a stationary target unchanged (held mover: %s)", (held) => {
    for (const reversed of [false, true]) {
      const moving = body({ vx: 1000, held });
      const target = body({ x: 19, mass: 8 });
      const original = { ...target };
      if (reversed) collide(target, moving);
      else collide(moving, target);
      expect(target).toEqual(original);
      expect(moving.vx).toBeCloseTo(held ? 0 : -520);
      expect(moving.x + moving.width - target.x).toBeLessThanOrEqual(0.011);
    }
  });

  it("keeps overlapping resting objects stationary", () => {
    const a = body();
    const b = body({ x: 19 });
    const originals = [{ ...a }, { ...b }];
    collide(a, b);
    expect([a, b]).toEqual(originals);
  });

  it("bounces at each viewport border without adding energy", () => {
    for (const position of [{ x: -5, y: -5, vx: -100, vy: -100 }, { x: 95, y: 95, vx: 100, vy: 100 }]) {
      const item = body(position);
      confine(item, 100, 100);
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeGreaterThanOrEqual(0);
      expect(item.x + item.width).toBeLessThanOrEqual(100);
      expect(item.y + item.height).toBeLessThanOrEqual(100);
      expect(Math.abs(item.vx)).toBe(52);
      expect(Math.sign(item.vx)).toBe(-Math.sign(position.vx));
    }
  });

  it("slows a throw three times faster than the original friction", () => {
    const item = body({ vx: 1000 });
    applyFriction(item, 0.1);
    expect(item.vx).toBeCloseTo(1000 * Math.exp(-3 * 3.8 * 0.1));
  });

  it("has frame-rate independent friction and comes to rest", () => {
    const a = body({ vx: 1000 });
    const b = body({ vx: 1000 });
    for (let i = 0; i < 60; i++) applyFriction(a, 1 / 60);
    for (let i = 0; i < 120; i++) applyFriction(b, 1 / 120);
    expect(a.vx).toBeCloseTo(b.vx);
    for (let i = 0; i < 120; i++) applyFriction(a, 1 / 60);
    expect(a.vx).toBe(0);
  });
});
