export const WF_DEVICE_COOKIE = "wf_dev_fp";
export const MAX_TRACKED_DEVICES_PER_USER = 2;
/** Recent window for “concurrent IP” warning (distinct IPs among active devices). */
export const CONCURRENT_IP_WINDOW_MINUTES = 15;

const FP_RE = /^[a-zA-Z0-9_-]{8,128}$/;

export function isValidDeviceFingerprint(value: unknown): value is string {
  return typeof value === "string" && FP_RE.test(value);
}
