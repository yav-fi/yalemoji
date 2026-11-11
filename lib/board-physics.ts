/** Positions in CSS pixels, velocities in pixels/second, masses in grams. */
export type BoardBody = {
  x: number; y: number; width: number; height: number;
  vx: number; vy: number; mass: number; held: boolean;
};

const RESTITUTION = 0.52;

/** Sweep pointer movement to the first obstacle, then slide along its surface. */
export function moveDragged(body: BoardBody, dx: number, dy: number, obstacles: BoardBody[]) {
  let blockedX = false;
  let blockedY = false;
  for (let pass = 0; pass < 3 && (dx !== 0 || dy !== 0); pass++) {
    let first = 1;
    let hitX = false;
    let hitY = false;
    for (const other of obstacles) {
      if (other === body) continue;
      const axis = (start: number, size: number, low: number, extent: number, delta: number) => {
        if (delta === 0) return start + size <= low || start >= low + extent
          ? [Infinity, -Infinity] : [-Infinity, Infinity];
        const near = (low - start - size) / delta;
        const far = (low + extent - start) / delta;
        return delta > 0 ? [near, far] : [far, near];
      };
      const [enterX, exitX] = axis(body.x, body.width, other.x, other.width, dx);
      const [enterY, exitY] = axis(body.y, body.height, other.y, other.height, dy);
      const enter = Math.max(enterX, enterY);
      const exit = Math.min(exitX, exitY);
      if (enter < 0 || enter > first || enter > exit) continue;
      if (enter < first) { hitX = false; hitY = false; }
      first = enter;
      hitX ||= enterX >= enterY;
      hitY ||= enterY >= enterX;
    }
    body.x += dx * first;
    body.y += dy * first;
    dx *= 1 - first;
    dy *= 1 - first;
    if (hitX) { dx = 0; blockedX = true; }
    if (hitY) { dy = 0; blockedY = true; }
  }
  return { blockedX, blockedY };
}

export function collide(a: BoardBody, b: BoardBody) {
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  if (overlapX <= 0 || overlapY <= 0) return;
  const horizontal = overlapX < overlapY;
  const nx = horizontal ? (a.x + a.width / 2 < b.x + b.width / 2 ? 1 : -1) : 0;
  const ny = horizontal ? 0 : (a.y + a.height / 2 < b.y + b.height / 2 ? 1 : -1);
  if (a.held || b.held) {
    // A held object is controlled by the pointer: constrain it without a bounce.
    const dragged = a.held ? a : b;
    const sign = a.held ? -1 : 1;
    dragged.x += nx * sign * overlapX;
    dragged.y += ny * sign * overlapY;
    if (dragged.vx * nx * sign < 0) dragged.vx = 0;
    if (dragged.vy * ny * sign < 0) dragged.vy = 0;
    return;
  }
  // Resting objects act as obstacles: only objects already moving can respond.
  // This also stops a dragged object from displacing a stationary target.
  const invA = a.vx === 0 && a.vy === 0 ? 0 : 1 / a.mass;
  const invB = b.vx === 0 && b.vy === 0 ? 0 : 1 / b.mass;
  const total = invA + invB;
  if (!total) return;
  const correction = Math.max(0, (horizontal ? overlapX : overlapY) - 0.01) / total;
  a.x -= nx * correction * invA;
  a.y -= ny * correction * invA;
  b.x += nx * correction * invB;
  b.y += ny * correction * invB;
  const approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (approach >= 0) return;
  const impulse = -(1 + RESTITUTION) * approach / total;
  a.vx -= impulse * nx * invA;
  a.vy -= impulse * ny * invA;
  b.vx += impulse * nx * invB;
  b.vy += impulse * ny * invB;
}

export function confine(body: BoardBody, width: number, height: number) {
  const maxX = Math.max(0, width - body.width);
  const maxY = Math.max(0, height - body.height);
  if (body.x < 0 || body.x > maxX) {
    body.x = Math.max(0, Math.min(maxX, body.x));
    if ((body.x === 0 && body.vx < 0) || (body.x === maxX && body.vx > 0)) body.vx *= body.held ? 0 : -RESTITUTION;
  }
  if (body.y < 0 || body.y > maxY) {
    body.y = Math.max(0, Math.min(maxY, body.y));
    if ((body.y === 0 && body.vy < 0) || (body.y === maxY && body.vy > 0)) body.vy *= body.held ? 0 : -RESTITUTION;
  }
}

export function applyFriction(body: BoardBody, dt: number) {
  const damping = Math.exp(-11.4 * dt);
  body.vx *= damping;
  body.vy *= damping;
  if (Math.hypot(body.vx, body.vy) < 2) body.vx = body.vy = 0;
}
