import test from "node:test";
import assert from "node:assert/strict";

import {
  emulateDevice,
  resetEmulation,
  DEVICE_PRESETS,
} from "../../dist/src/driver/emulate.js";
import { setOverrides } from "../../dist/src/state.js";

function withCdpOverride(handler, fn) {
  const restore = setOverrides({ cdpOverride: handler });
  return Promise.resolve().then(fn).finally(restore);
}

test("DEVICE_PRESETS contains at least iPhone 14, Pixel 7, and iPad Pro", () => {
  assert.ok("iPhone 14" in DEVICE_PRESETS);
  assert.ok("Pixel 7" in DEVICE_PRESETS);
  assert.ok("iPad Pro" in DEVICE_PRESETS);
});

test("emulateDevice with a known preset sends correct CDP calls", async () => {
  const calls = [];
  await withCdpOverride(
    async (method, params) => {
      calls.push({ method, params });
      return {};
    },
    async () => {
      const result = await emulateDevice("iPhone 14");
      assert.equal(result.width, DEVICE_PRESETS["iPhone 14"].width);
      assert.equal(result.height, DEVICE_PRESETS["iPhone 14"].height);
      assert.equal(
        result.deviceScaleFactor,
        DEVICE_PRESETS["iPhone 14"].deviceScaleFactor,
      );
      assert.equal(result.mobile, true);
    },
  );

  const metricsCall = calls.find(
    (c) => c.method === "Emulation.setDeviceMetricsOverride",
  );
  assert.ok(metricsCall, "should have called Emulation.setDeviceMetricsOverride");
  assert.equal(metricsCall.params.width, DEVICE_PRESETS["iPhone 14"].width);
  assert.equal(metricsCall.params.height, DEVICE_PRESETS["iPhone 14"].height);
  assert.equal(metricsCall.params.mobile, true);

  const uaCall = calls.find(
    (c) => c.method === "Emulation.setUserAgentOverride",
  );
  assert.ok(uaCall, "should have called Emulation.setUserAgentOverride");
  assert.ok(uaCall.params.userAgent.includes("iPhone"));
});

test("emulateDevice options override preset values", async () => {
  const calls = [];
  await withCdpOverride(
    async (method, params) => {
      calls.push({ method, params });
      return {};
    },
    async () => {
      const result = await emulateDevice("iPhone 14", {
        width: 428,
        height: 926,
        deviceScaleFactor: 2,
      });
      assert.equal(result.width, 428);
      assert.equal(result.height, 926);
      assert.equal(result.deviceScaleFactor, 2);
    },
  );

  const metricsCall = calls.find(
    (c) => c.method === "Emulation.setDeviceMetricsOverride",
  );
  assert.equal(metricsCall.params.width, 428);
  assert.equal(metricsCall.params.height, 926);
  assert.equal(metricsCall.params.deviceScaleFactor, 2);
});

test("emulateDevice with landscape orientation sends angle 90 and landscapePrimary", async () => {
  const calls = [];
  await withCdpOverride(
    async (method, params) => {
      calls.push({ method, params });
      return {};
    },
    async () => {
      await emulateDevice("iPhone 14", { screenOrientation: 90 });
    },
  );

  const metricsCall = calls.find(
    (c) => c.method === "Emulation.setDeviceMetricsOverride",
  );
  assert.deepEqual(metricsCall.params.screenOrientation, {
    angle: 90,
    type: "landscapePrimary",
  });
});

test("emulateDevice with 180 orientation sends portraitSecondary", async () => {
  const calls = [];
  await withCdpOverride(
    async (method, params) => {
      calls.push({ method, params });
      return {};
    },
    async () => {
      await emulateDevice("iPhone 14", { screenOrientation: 180 });
    },
  );

  const metricsCall = calls.find(
    (c) => c.method === "Emulation.setDeviceMetricsOverride",
  );
  assert.deepEqual(metricsCall.params.screenOrientation, {
    angle: 180,
    type: "portraitSecondary",
  });
});

test("emulateDevice with 270 orientation sends landscapeSecondary", async () => {
  const calls = [];
  await withCdpOverride(
    async (method, params) => {
      calls.push({ method, params });
      return {};
    },
    async () => {
      await emulateDevice("iPhone 14", { screenOrientation: 270 });
    },
  );

  const metricsCall = calls.find(
    (c) => c.method === "Emulation.setDeviceMetricsOverride",
  );
  assert.deepEqual(metricsCall.params.screenOrientation, {
    angle: 270,
    type: "landscapeSecondary",
  });
});

test("emulateDevice with a custom descriptor applies width and height", async () => {
  const calls = [];
  await withCdpOverride(
    async (method, params) => {
      calls.push({ method, params });
      return {};
    },
    async () => {
      const result = await emulateDevice({ width: 360, height: 800 });
      assert.equal(result.width, 360);
      assert.equal(result.height, 800);
      assert.equal(result.deviceScaleFactor, 1);
      assert.equal(result.mobile, false);
    },
  );

  const metricsCall = calls.find(
    (c) => c.method === "Emulation.setDeviceMetricsOverride",
  );
  assert.equal(metricsCall.params.width, 360);
  assert.equal(metricsCall.params.height, 800);
});

test("emulateDevice custom descriptor without userAgent skips Emulation.setUserAgentOverride", async () => {
  const calls = [];
  await withCdpOverride(
    async (method, params) => {
      calls.push({ method, params });
      return {};
    },
    async () => {
      await emulateDevice({ width: 360, height: 800 });
    },
  );

  assert.ok(
    !calls.some((c) => c.method === "Emulation.setUserAgentOverride"),
    "should not call setUserAgentOverride when userAgent is empty",
  );
});

test("emulateDevice throws for an unknown preset name", async () => {
  await assert.rejects(
    () => emulateDevice("Foobar Phone 9000"),
    /Unknown device preset.*Foobar Phone 9000/,
  );
});

test("emulateDevice throws when custom descriptor is missing width", async () => {
  await assert.rejects(
    () => emulateDevice({ height: 800 }),
    /must include numeric width and height/,
  );
});

test("resetEmulation sends clearDeviceMetricsOverride and empty userAgent", async () => {
  const calls = [];
  await withCdpOverride(
    async (method, params) => {
      calls.push({ method, params });
      return {};
    },
    async () => {
      await resetEmulation();
    },
  );

  assert.ok(
    calls.some((c) => c.method === "Emulation.clearDeviceMetricsOverride"),
    "should call Emulation.clearDeviceMetricsOverride",
  );
  const uaCall = calls.find(
    (c) => c.method === "Emulation.setUserAgentOverride",
  );
  assert.ok(uaCall, "should call Emulation.setUserAgentOverride");
  assert.equal(uaCall.params.userAgent, "");
});
