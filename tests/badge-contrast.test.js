import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Check every point of the button hover transition, including saved badges.
test("record badges meet AA contrast across button background transitions", () => {
  const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");
  const colors = Object.fromEntries(
    [...css.matchAll(/--([\w-]+):\s*#([\da-f]{6})/g)].map(([, name, hex]) => [
      name,
      hex.match(/../g).map((channel) => parseInt(channel, 16)),
    ]),
  );
  const luminance = (rgb) =>
    rgb
      .map((value) => value / 255)
      .map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      )
      .reduce(
        (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
        0,
      );
  for (const selector of [".record-badge", ".record-badge.saved"]) {
    const declaration = css.slice(css.indexOf(`${selector} {`)).split("}")[0];
    const foreground = colors[declaration.match(/color: var\(--([\w-]+)\)/)[1]];
    for (let step = 0; step <= 100; step++) {
      const background = colors.button.map(
        (value, index) =>
          value + ((colors["button-hover"][index] - value) * step) / 100,
      );
      const ratio =
        (luminance(background) + 0.05) / (luminance(foreground) + 0.05);
      assert.ok(ratio >= 4.5, `${selector} at ${step}% hover: ${ratio}`);
    }
  }
});
