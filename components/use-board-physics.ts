"use client";

import { useEffect, useRef } from "react";
import { applyFriction, collide, confine, moveDragged, type BoardBody } from "@/lib/board-physics";

type Body = BoardBody & {
  el: HTMLElement; homeX: number; homeY: number; tether: boolean;
  pointer: number | null; downX: number; downY: number;
  lastPointerX: number; lastPointerY: number;
  lastTime: number; travel: number;
};

export function useBoardPhysics() {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const stage = ref.current;
    if (!stage) return;
    let bodies: Body[] = [];
    let width = stage.clientWidth;
    let height = stage.clientHeight;
    let frame = 0;
    let previous = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function measure() {
      width = stage!.clientWidth;
      height = stage!.clientHeight;
      const existing = new Map(bodies.map((body) => [body.el, body]));
      bodies = Array.from(stage!.querySelectorAll<HTMLElement>("[data-physics-body]")).map((el) => {
        const old = existing.get(el);
        // Read layout offsets, never the animated/transformed entrance rectangles.
        const slot = el.parentElement!;
        const homeX = slot.offsetLeft;
        const homeY = slot.offsetTop;
        const body: Body = old ?? {
          el, x: homeX, y: homeY, vx: 0, vy: 0, width: el.offsetWidth, height: el.offsetHeight,
          mass: Number(el.dataset.massGrams), held: false, tether: el.dataset.tether === "medal",
          homeX, homeY, pointer: null, downX: 0, downY: 0, lastPointerX: 0, lastPointerY: 0,
          lastTime: 0, travel: 0
        };
        if (old) {
          body.x += homeX - body.homeX;
          body.y += homeY - body.homeY;
          Object.assign(body, { homeX, homeY, width: el.offsetWidth, height: el.offsetHeight });
        }
        return body;
      });
    }

    function constrain(body: Body) {
      if (!body.tether) return confine(body, width, height);
      const maxPull = Math.min(56, body.height * 0.12);
      let dx = body.x - body.homeX;
      let dy = body.y - body.homeY;
      const length = Math.hypot(dx, dy);
      if (length > maxPull) {
        dx *= maxPull / length;
        dy *= maxPull / length;
        const outward = (body.vx * dx + body.vy * dy) / maxPull;
        if (outward > 0) {
          body.vx -= outward * dx / maxPull;
          body.vy -= outward * dy / maxPull;
        }
      }
      body.x = body.homeX + dx;
      // Leave extra bleed for the image rotation so its top never enters the board.
      const maxY = -body.width * 0.025 - 2;
      body.y = Math.min(body.homeY + dy, maxY);
      if (body.y === maxY && body.vy > 0) body.vy = 0;
    }

    function down(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const target = (event.target as Element).closest<HTMLElement>("[data-draggable]");
      const body = bodies.find((item) => item.el === target);
      if (!body || body.held) return;
      event.preventDefault();
      Object.assign(body, { held: true, pointer: event.pointerId, downX: event.clientX,
        downY: event.clientY,
        lastPointerX: event.clientX, lastPointerY: event.clientY, lastTime: performance.now(), vx: 0, vy: 0, travel: 0 });
      body.el.setPointerCapture(event.pointerId);
      body.el.style.cursor = "grabbing";
    }

    function move(event: PointerEvent) {
      const body = bodies.find((item) => item.pointer === event.pointerId);
      if (!body) return;
      const now = performance.now();
      const dt = Math.max((now - body.lastTime) / 1000, 0.008);
      const oldX = body.x;
      const oldY = body.y;
      const { blockedX, blockedY } = moveDragged(body,
        event.clientX - body.lastPointerX, event.clientY - body.lastPointerY, bodies);
      body.lastPointerX = event.clientX;
      body.lastPointerY = event.clientY;
      constrain(body);
      body.vx = blockedX ? 0 : Math.max(-2200, Math.min(2200, (body.x - oldX) / dt));
      body.vy = blockedY ? 0 : Math.max(-2200, Math.min(2200, (body.y - oldY) / dt));
      body.travel = Math.max(body.travel, Math.hypot(event.clientX - body.downX, event.clientY - body.downY));
      body.lastTime = now;
    }

    function up(event: PointerEvent) {
      const body = bodies.find((item) => item.pointer === event.pointerId);
      if (!body) return;
      body.held = false;
      body.pointer = null;
      body.el.style.cursor = "grab";
      if (body.el.hasPointerCapture(event.pointerId)) body.el.releasePointerCapture(event.pointerId);
      const cancelled = event.type !== "pointerup";
      if (cancelled || performance.now() - body.lastTime > 90 || reducedMotion.matches) body.vx = body.vy = 0;
      if (cancelled) return;
      if (body.tether) {
        const towardX = width / 2 - (body.homeX + body.width / 2);
        const towardY = height / 2 - (body.homeY + body.height / 2);
        const pull = ((body.x - body.homeX) * towardX + (body.y - body.homeY) * towardY) / Math.hypot(towardX, towardY);
        if (pull > Math.min(22, body.height * 0.045)) body.el.dispatchEvent(new Event("physics-tug"));
      } else if (body.travel < 8) body.el.dispatchEvent(new Event("physics-tap"));
    }

    function tick(now: number) {
      const elapsed = previous ? Math.min((now - previous) / 1000, 1 / 30) : 1 / 60;
      previous = now;
      // Small substeps prevent fast throws from crossing small objects between frames.
      const steps = Math.ceil(elapsed / (1 / 240));
      const dt = elapsed / steps;
      for (let step = 0; step < steps; step++) {
        for (const body of bodies) {
          if (body.held) {
            if (now - body.lastTime > 90) body.vx = body.vy = 0;
            continue;
          }
          if (body.tether) {
            body.vx += (body.homeX - body.x) * 160 * dt;
            body.vy += (body.homeY - body.y) * 160 * dt;
            const damping = Math.exp(-15 * dt);
            body.vx *= damping;
            body.vy *= damping;
          } else applyFriction(body, dt);
          body.x += body.vx * dt;
          body.y += body.vy * dt;
          constrain(body);
        }
        for (let i = 0; i < bodies.length; i++) {
          for (let j = i + 1; j < bodies.length; j++) collide(bodies[i], bodies[j]);
        }
        bodies.forEach(constrain);
      }
      for (const body of bodies) {
        body.el.style.transform = `translate3d(${body.x - body.homeX}px, ${body.y - body.homeY}px, 0)`;
      }
      frame = requestAnimationFrame(tick);
    }

    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(stage);
    const mutations = new MutationObserver(measure);
    mutations.observe(stage, { childList: true, subtree: true });
    stage.addEventListener("pointerdown", down);
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    stage.addEventListener("lostpointercapture", up);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
      stage.removeEventListener("pointerdown", down);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerup", up);
      stage.removeEventListener("pointercancel", up);
      stage.removeEventListener("lostpointercapture", up);
      bodies.forEach(({ el }) => { el.style.transform = ""; });
    };
  }, []);
  return ref;
}
