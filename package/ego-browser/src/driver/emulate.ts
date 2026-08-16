import { cdp } from "../cdp-eval.js";

/** Named device presets for mobile viewport emulation. */
export const DEVICE_PRESETS: Record<
  string,
  {
    width: number;
    height: number;
    deviceScaleFactor: number;
    mobile: boolean;
    userAgent: string;
  }
> = {
  "iPhone 14": {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  },
  "iPhone 14 Pro Max": {
    width: 430,
    height: 932,
    deviceScaleFactor: 3,
    mobile: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  },
  "Pixel 7": {
    width: 412,
    height: 915,
    deviceScaleFactor: 2.625,
    mobile: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
  },
  "iPad Pro": {
    width: 1024,
    height: 1366,
    deviceScaleFactor: 2,
    mobile: false,
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  },
};

type EmulateDeviceOptions = {
  /** Viewport width in CSS pixels. Overrides the preset value. */
  width?: number;
  /** Viewport height in CSS pixels. Overrides the preset value. */
  height?: number;
  /** Device pixel ratio. Overrides the preset value. */
  deviceScaleFactor?: number;
  /** Whether to emulate a mobile device. Overrides the preset value. */
  mobile?: boolean;
  /** Custom user-agent string. Overrides the preset value. */
  userAgent?: string;
  /** Device orientation in degrees (0, 90, 180 or 270). Default 0. */
  screenOrientation?: 0 | 90 | 180 | 270;
};

/**
 * Emulate a mobile or tablet device viewport via CDP.
 * Pass a preset name (e.g. `"iPhone 14"`, `"Pixel 7"`, `"iPad Pro"`) or a
 * custom descriptor with at least `width` and `height`.
 * Any option overrides the preset for that field.
 * @param {string|{width:number,height:number,deviceScaleFactor?:number,mobile?:boolean,userAgent?:string}} device Preset name or custom descriptor.
 * @param {{width?:number,height?:number,deviceScaleFactor?:number,mobile?:boolean,userAgent?:string,screenOrientation?:0|90|180|270}} [options] Per-field overrides.
 * @returns {Promise<{width:number,height:number,deviceScaleFactor:number,mobile:boolean,userAgent:string}>} Applied settings.
 */
export async function emulateDevice(
  device: string | Omit<EmulateDeviceOptions, "screenOrientation">,
  options: EmulateDeviceOptions = {},
) {
  let base: (typeof DEVICE_PRESETS)[string];
  if (typeof device === "string") {
    const preset = DEVICE_PRESETS[device];
    if (!preset) {
      throw new Error(
        `Unknown device preset: ${JSON.stringify(device)}. ` +
          `Available: ${Object.keys(DEVICE_PRESETS).join(", ")}`,
      );
    }
    base = { ...preset };
  } else {
    if (
      typeof device.width !== "number" ||
      typeof device.height !== "number"
    ) {
      throw new Error(
        "emulateDevice: custom device descriptor must include numeric width and height",
      );
    }
    base = {
      width: device.width,
      height: device.height,
      deviceScaleFactor: device.deviceScaleFactor ?? 1,
      mobile: device.mobile ?? false,
      userAgent: device.userAgent ?? "",
    };
  }

  const width = options.width ?? base.width;
  const height = options.height ?? base.height;
  const deviceScaleFactor = options.deviceScaleFactor ?? base.deviceScaleFactor;
  const mobile = options.mobile ?? base.mobile;
  const userAgent = options.userAgent ?? base.userAgent;
  const angle = options.screenOrientation ?? 0;
  const orientationType: "portraitPrimary" | "landscapePrimary" | "portraitSecondary" | "landscapeSecondary" =
    angle === 90
      ? "landscapePrimary"
      : angle === 180
        ? "portraitSecondary"
        : angle === 270
          ? "landscapeSecondary"
          : "portraitPrimary";

  await cdp("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor,
    mobile,
    screenOrientation: { angle, type: orientationType },
  });

  if (userAgent) {
    await cdp("Emulation.setUserAgentOverride", { userAgent });
  }

  return { width, height, deviceScaleFactor, mobile, userAgent };
}

/**
 * Clear all device emulation overrides and restore the browser's real viewport.
 * @returns {Promise<void>}
 */
export async function resetEmulation() {
  await cdp("Emulation.clearDeviceMetricsOverride", {});
  await cdp("Emulation.setUserAgentOverride", { userAgent: "" });
}
