import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Icon, Logo } from "../../components/customer_ui.jsx";

function QrScanner({ onResult, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const onResultRef = useRef(onResult);
  const [status, setStatus] = useState("starting");
  const [message, setMessage] = useState("");
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    let stream;
    let frame;
    let stopped = false;
    const detector =
      "BarcodeDetector" in window
        ? new window.BarcodeDetector({ formats: ["qr_code"] })
        : null;

    function stopCamera() {
      stopped = true;
      cancelAnimationFrame(frame);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    }

    async function tick() {
      if (stopped) return;
      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        let value = "";
        try {
          if (detector) {
            const codes = await detector.detect(video);
            value = codes[0]?.rawValue || "";
          } else {
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d", {
              willReadFrequently: true,
            });
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const image = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height,
            );
            value = jsQR(image.data, image.width, image.height)?.data || "";
          }
        } catch {
          value = "";
        }
        if (value && !stopped) {
          stopCamera();
          onResultRef.current(value);
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setMessage(
          "Camera is not available here. Open the site over HTTPS or enter your table code below.",
        );
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setStatus("scanning");
        tick();
      } catch (error) {
        setStatus("error");
        setMessage(
          error?.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access in your browser, or enter your table code below."
            : "Could not start the camera. You can enter your table code below instead.",
        );
      }
    }

    start();
    return stopCamera;
  }, []);

  function handleManualSubmit(event) {
    event.preventDefault();
    const code = manualCode.trim();
    if (code) onResultRef.current(code);
  }

  return (
    <div className="cx-rise">
      <div className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-3xl bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />

        {status === "scanning" && (
          <>
            <span
              aria-hidden="true"
              className="absolute left-[12%] top-[12%] h-8 w-8 rounded-tl-xl border-l-[3px] border-t-[3px] border-white"
            />
            <span
              aria-hidden="true"
              className="absolute right-[12%] top-[12%] h-8 w-8 rounded-tr-xl border-r-[3px] border-t-[3px] border-white"
            />
            <span
              aria-hidden="true"
              className="absolute bottom-[12%] left-[12%] h-8 w-8 rounded-bl-xl border-b-[3px] border-l-[3px] border-white"
            />
            <span
              aria-hidden="true"
              className="absolute bottom-[12%] right-[12%] h-8 w-8 rounded-br-xl border-b-[3px] border-r-[3px] border-white"
            />
            <span
              aria-hidden="true"
              className="cx-scan absolute inset-x-[14%] h-[2px] rounded-full bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.8)]"
            />
          </>
        )}

        {status === "starting" && (
          <div className="absolute inset-0 grid place-items-center text-[0.85rem] font-medium text-white/80">
            Starting camera…
          </div>
        )}
      </div>

      {status === "error" ? (
        <p
          className="auth-error mx-0 mb-0 mt-4 rounded-xl border border-[color-mix(in_srgb,currentColor_20%,transparent)] px-3.5 py-2.5 text-[0.85rem] font-medium"
          role="alert"
        >
          {message}
        </p>
      ) : (
        <p className="m-0 mt-4 text-center text-[0.85rem] font-medium opacity-70">
          Point your camera at the QR code on your table.
        </p>
      )}

      <form onSubmit={handleManualSubmit} className="mt-5 flex gap-2.5">
        <input
          value={manualCode}
          onChange={(event) => setManualCode(event.target.value)}
          placeholder="Or enter table code"
          aria-label="Table code"
          className="h-[48px] min-w-0 flex-1 rounded-[14px] border-[1.5px] border-[color-mix(in_srgb,currentColor_16%,transparent)] px-4 text-[0.9rem] font-medium outline-none transition placeholder:font-normal placeholder:opacity-45 focus:border-[color-mix(in_srgb,currentColor_60%,transparent)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,currentColor_10%,transparent)]"
        />
        <button
          type="submit"
          className="h-[48px] cursor-pointer rounded-[14px] px-5 text-[0.9rem] font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!manualCode.trim()}
        >
          Go
        </button>
      </form>

      <button
        type="button"
        onClick={onCancel}
        className="text-link mx-auto mt-4 block cursor-pointer border-0 p-0 text-[0.9rem] font-semibold underline decoration-transparent underline-offset-4 transition hover:decoration-current"
      >
        Cancel
      </button>
    </div>
  );
}

export default function CosOrderType({ onDineIn, onTakeout }) {
  const [scanning, setScanning] = useState(false);

  function handleScanResult(value) {
    setScanning(false);
    onDineIn(value);
  }

  const options = [
    {
      key: "dine",
      icon: "qr",
      title: "Dine In",
      text: "Scan the QR code at your table",
      onClick: () => setScanning(true),
    },
    {
      key: "take",
      icon: "cup",
      title: "Take Out",
      text: "Order ahead and pick it up",
      onClick: onTakeout,
    },
  ];

  return (
    <div className="auth-shell flex min-h-dvh flex-col items-center justify-center px-4 py-6 font-['Plus_Jakarta_Sans',ui-sans-serif,system-ui,sans-serif] antialiased">
      <style>{`
        @keyframes cx-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cx-scan { 0% { top: 14%; } 50% { top: 84%; } 100% { top: 14%; } }
        .cx-rise { animation: cx-rise .6s cubic-bezier(.2,.8,.2,1) both; }
        .cx-scan { animation: cx-scan 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .cx-rise, .cx-scan { animation: none !important; } }
      `}</style>

      <section className="order-type-card w-full max-w-[420px] rounded-[24px] px-5 pb-6 pt-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.08),0_32px_64px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:px-8 sm:pb-7 sm:pt-9">
        <div className="auth-brand mb-5 flex items-center justify-center">
          <Logo />
        </div>

        {scanning ? (
          <>
            <h1 className="m-0 text-center text-[1.5rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[1.7rem]">
              Scan your table
            </h1>
            <p className="mb-6 mt-2 text-center text-[0.95rem] font-medium opacity-65">
              Dine-in ordering
            </p>
            <QrScanner
              onResult={handleScanResult}
              onCancel={() => setScanning(false)}
            />
          </>
        ) : (
          <>
            <p className="eyebrow m-0 flex items-center justify-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-[0.2em] opacity-70">
              <Icon name="leaf" size={15} /> Your Order
            </p>
            <h1 className="m-0 mt-3 text-center text-[1.5rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[1.75rem]">
              How would you like to enjoy your order?
            </h1>
            <p className="order-type-subtitle mb-7 mt-2 text-center text-[0.95rem] font-medium opacity-65">
              Choose dine-in or takeout to continue.
            </p>

            <div className="flex flex-col gap-3.5">
              {options.map((option, index) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={option.onClick}
                  style={{ animationDelay: `${0.1 + index * 0.1}s` }}
                  className="order-type-option cx-rise group flex w-full cursor-pointer items-center gap-4 rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,currentColor_16%,transparent)] px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,currentColor_40%,transparent)] hover:shadow-[0_10px_24px_rgba(0,0,0,0.1)] active:translate-y-0 active:shadow-none"
                >
                  <span className="order-type-icon grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px] border border-[color-mix(in_srgb,currentColor_14%,transparent)]">
                    <Icon name={option.icon} size={25} />
                  </span>
                  <span className="order-type-copy flex min-w-0 flex-1 flex-col gap-0.5">
                    <strong className="text-[1rem] font-bold tracking-[-0.01em]">
                      {option.title}
                    </strong>
                    <span className="text-[0.82rem] font-medium opacity-65">
                      {option.text}
                    </span>
                  </span>
                  <span className="opacity-60 transition group-hover:translate-x-1 group-hover:opacity-100">
                    <Icon name="arrow" size={19} />
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        <footer className="auth-footer mt-8 text-center">
          <p className="auth-wordmark m-0 text-[0.85rem] font-extrabold uppercase tracking-[0.35em] opacity-70">
            CrumblyX
          </p>
          <p className="auth-est mb-0 mt-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.25em] opacity-50">
            Est. 2026
          </p>
        </footer>
      </section>
    </div>
  );
}
