"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

type Props = {
  room: string;
  /** Pixel size of the QR image (excluding padding). */
  size?: number;
};

export function RemoteControlQr({ room, size = 168 }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const path = `/present/control?room=${encodeURIComponent(room)}`;
    const url = `${window.location.origin}${path}`;
    let cancelled = false;
    void QRCode.toDataURL(url, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((u) => {
        if (!cancelled) setDataUrl(u);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [room, size]);

  if (failed) {
    return (
      <p className="text-center text-[11px] text-white/45">
        Could not create QR code. Use <strong className="text-white/60">Remote →</strong> instead.
      </p>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className="animate-pulse rounded-xl border border-white/10 bg-white/5"
        style={{ width: size + 16, height: size + 16 }}
        aria-hidden
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode */}
      <img
        src={dataUrl}
        width={size}
        height={size}
        alt={`Scan to open remote control for room ${room}`}
        className="rounded-xl border border-white/15 bg-white p-2 shadow-lg shadow-black/40"
      />
    </div>
  );
}
