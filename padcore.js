// Pure helpers for the signature pad: stroke simplification and compact encoding (no DOM here).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PadCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  function distToSegment(p, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    var t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }

  // Ramer-Douglas-Peucker, iterative so long strokes cannot overflow the call stack
  function simplify(points, eps) {
    if (points.length < 3) return points.slice();
    var keep = new Array(points.length).fill(false);
    keep[0] = keep[points.length - 1] = true;
    var stack = [[0, points.length - 1]];
    while (stack.length) {
      var seg = stack.pop(), first = seg[0], last = seg[1];
      var worst = -1, index = -1;
      for (var i = first + 1; i < last; i++) {
        var d = distToSegment(points[i], points[first], points[last]);
        if (d > worst) { worst = d; index = i; }
      }
      if (worst > eps) { keep[index] = true; stack.push([first, index], [index, last]); }
    }
    return points.filter(function (_, i) { return keep[i]; });
  }

  function flatten(points) {
    var out = [];
    points.forEach(function (p) { out.push(Math.round(p[0]), Math.round(p[1])); });
    return out;
  }

  // Telegram allows 4096 bytes in sendData; keep the JSON under maxBytes by simplifying harder until it fits.
  function encode(strokes, w, h, maxBytes) {
    var eps = 0.6;
    for (var round = 0; round < 16; round++) {
      var s = strokes.map(function (st) { return flatten(simplify(st, eps)); })
                     .filter(function (a) { return a.length >= 2; });
      var json = JSON.stringify({ v: 1, w: Math.round(w), h: Math.round(h), s: s });
      if (json.length <= maxBytes) return json;
      eps *= 1.4;
    }
    return null;
  }

  return { simplify: simplify, encode: encode };
});
