/* Ilha dos Dinos — colisões, movimento de corpos e raio de mira. */
(function () {
  'use strict';
  var G = window.G;
  var EPS = 0.001;
  G.GRAVITY = 24;
  G.JUMP_V = 8.3;

  function collides(x, y, z, w, h) {
    var x0 = Math.floor(x - w), x1 = Math.floor(x + w);
    var y0 = Math.floor(y), y1 = Math.floor(y + h);
    var z0 = Math.floor(z - w), z1 = Math.floor(z + w);
    for (var ix = x0; ix <= x1; ix++) for (var iz = z0; iz <= z1; iz++) for (var iy = y0; iy <= y1; iy++) {
      if (G.isSolid(ix, iy, iz)) return true;
    }
    return false;
  }
  G.collides = collides;

  // corpo: {x,y,z,vx,vy,vz,w,h,onGround,inWater,fly,autoStep,swimUp,hitWall}
  G.moveBody = function (b, dt) {
    var w = b.w, h = b.h;
    b.inWater = G.isWater(Math.floor(b.x), Math.floor(b.y + h * 0.4), Math.floor(b.z));
    if (!b.fly) {
      if (b.inWater) {
        b.vy -= 6 * dt;
        b.vy += 15 * dt; // flutua
        if (b.vy > 2.6) b.vy = 2.6;
        if (b.swimUp) b.vy = 4.2;
        b.vy *= Math.max(0, 1 - 2.5 * dt);
      } else {
        b.vy -= G.GRAVITY * dt;
        if (b.vy < -30) b.vy = -30;
      }
    }
    b.hitWall = false;
    var slow = (b.inWater && !b.fly) ? 0.6 : 1;

    // X
    var nx = b.x + b.vx * slow * dt;
    if (!collides(nx, b.y, b.z, w, h)) b.x = nx;
    else {
      var sx = b.vx > 0 ? Math.floor(nx + w) - w - EPS : Math.floor(nx - w) + 1 + w + EPS;
      if (Math.abs(sx - b.x) < Math.abs(nx - b.x) + 0.01 && !collides(sx, b.y, b.z, w, h)) b.x = sx;
      b.hitWall = true;
    }
    // Z
    var nz = b.z + b.vz * slow * dt;
    if (!collides(b.x, b.y, nz, w, h)) b.z = nz;
    else {
      var sz = b.vz > 0 ? Math.floor(nz + w) - w - EPS : Math.floor(nz - w) + 1 + w + EPS;
      if (Math.abs(sz - b.z) < Math.abs(nz - b.z) + 0.01 && !collides(b.x, b.y, sz, w, h)) b.z = sz;
      b.hitWall = true;
    }
    // Y
    var wasGround = b.onGround;
    b.onGround = false;
    var ny = b.y + b.vy * dt;
    if (!collides(b.x, ny, b.z, w, h)) b.y = ny;
    else {
      if (b.vy < 0) {
        var sy = Math.floor(ny) + 1;
        if (sy <= b.y + 0.001 && !collides(b.x, sy, b.z, w, h)) b.y = sy;
        b.onGround = true;
      } else {
        var cy = Math.floor(ny + h) - h - EPS;
        if (cy >= b.y && !collides(b.x, cy, b.z, w, h)) b.y = cy;
      }
      b.vy = 0;
    }
    // sobe degraus de 1 bloco sozinho
    if (b.autoStep && b.hitWall && !b.fly && (b.onGround || wasGround || b.inWater)) {
      var mag = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
      if (mag > 0.2) {
        var ax = b.x + (b.vx / mag) * 0.3, az = b.z + (b.vz / mag) * 0.3;
        if (!collides(ax, b.y + 1.05, az, w, h) && !collides(b.x, b.y + 1.05, b.z, w, h)) {
          b.vy = b.inWater ? 6.5 : G.JUMP_V;
          b.onGround = false;
        } else if (b.bigStep && !collides(ax, b.y + 2.05, az, w, h) && !collides(b.x, b.y + 2.05, b.z, w, h)) {
          b.vy = b.inWater ? 9 : 10.8; // degrau de 2 blocos: a criança não fica presa em socalcos
          b.onGround = false;
        }
      }
    }
    // nunca sai do mundo
    if (b.x < 0.5 + w) b.x = 0.5 + w; if (b.x > G.W - 0.5 - w) b.x = G.W - 0.5 - w;
    if (b.z < 0.5 + w) b.z = 0.5 + w; if (b.z > G.D - 0.5 - w) b.z = G.D - 0.5 - w;
    if (b.y < 1) { b.y = 1; b.vy = 0; }
    if (b.y > G.H + 20) { b.y = G.H + 20; if (b.vy > 0) b.vy = 0; }
  };

  // liberta um corpo preso dentro de blocos (sobe até ficar livre)
  G.unstick = function (b) {
    var n = 0;
    while (collides(b.x, b.y, b.z, b.w, b.h) && n++ < G.H) b.y = Math.floor(b.y) + 1;
  };

  // raio pelos blocos (DDA). Devolve bloco atingido e a célula vazia anterior.
  G.raycast = function (ox, oy, oz, dx, dy, dz, maxD) {
    var x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    var sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    var tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    var tdy = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    var tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
    var tmx = dx !== 0 ? (dx > 0 ? x + 1 - ox : ox - x) * tdx : Infinity;
    var tmy = dy !== 0 ? (dy > 0 ? y + 1 - oy : oy - y) * tdy : Infinity;
    var tmz = dz !== 0 ? (dz > 0 ? z + 1 - oz : oz - z) * tdz : Infinity;
    var px = x, py = y, pz = z, t = 0;
    for (var i = 0; i < 80; i++) {
      px = x; py = y; pz = z;
      if (tmx < tmy && tmx < tmz) { t = tmx; x += sx; tmx += tdx; }
      else if (tmy < tmz) { t = tmy; y += sy; tmy += tdy; }
      else { t = tmz; z += sz; tmz += tdz; }
      if (t > maxD) return null;
      if (G.inBounds(x, y, z)) {
        var b = G.blocks[G.idx(x, y, z)];
        if (b !== 0 && b !== 5) return { x: x, y: y, z: z, px: px, py: py, pz: pz, t: t, id: b };
      }
    }
    return null;
  };
})();
