import { Logo } from "../../components/customer_ui.jsx";

const BRAND = "CrumblyX";
const FEATURES = [
  "QR Table Ordering",
  "Drink Customization",
  "Live Chat",
  "Takeout & Delivery",
];

export default function CosWelcome({ onContinue }) {
  return (
    <section className="welcome-screen flex min-h-dvh flex-col items-center justify-center px-6 py-10 text-center font-['Plus_Jakarta_Sans',ui-sans-serif,system-ui,sans-serif] antialiased">
      <style>{`
        @keyframes cx-pop { from { opacity: 0; transform: scale(.55) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes cx-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes cx-ring { from { opacity: .35; transform: scale(.85); } to { opacity: 0; transform: scale(1.7); } }
        @keyframes cx-letter { from { opacity: 0; transform: translateY(.7em); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cx-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cx-line { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .cx-pop { animation: cx-pop .9s cubic-bezier(.2,1.2,.3,1) both; }
        .cx-float { animation: cx-float 4s ease-in-out 1s infinite; }
        .cx-ring { animation: cx-ring 3.2s ease-out infinite; }
        .cx-letter { display: inline-block; animation: cx-letter .6s cubic-bezier(.2,.8,.2,1) both; }
        .cx-rise { animation: cx-rise .7s cubic-bezier(.2,.8,.2,1) both; }
        .cx-line { transform-origin: center; animation: cx-line .8s cubic-bezier(.2,.8,.2,1) 1.2s both; }
        @media (prefers-reduced-motion: reduce) {
          .cx-pop, .cx-float, .cx-ring, .cx-letter, .cx-rise, .cx-line { animation: none !important; }
        }
      `}</style>

      <div className="welcome-brand flex flex-col items-center">
        <div className="cx-pop relative grid place-items-center p-8">
          <span
            aria-hidden="true"
            className="cx-ring absolute inset-0 rounded-full border border-current"
          />
          <span
            aria-hidden="true"
            className="cx-ring absolute inset-0 rounded-full border border-current"
            style={{ animationDelay: "1.6s" }}
          />
          <div className="cx-float">
            <Logo />
          </div>
        </div>

        <p
          className="welcome-name m-0 mt-4 text-[2.2rem] font-extrabold tracking-[-0.03em] sm:text-[2.6rem]"
          aria-label={BRAND}
        >
          {BRAND.split("").map((letter, index) => (
            <span
              key={index}
              aria-hidden="true"
              className="cx-letter"
              style={{ animationDelay: `${0.6 + index * 0.07}s` }}
            >
              {letter}
            </span>
          ))}
        </p>

        <span
          aria-hidden="true"
          className="cx-line mt-3 block h-[3px] w-14 rounded-full bg-current opacity-40"
        />

        <p
          className="welcome-subtitle cx-rise m-0 mt-3 text-[0.78rem] font-semibold uppercase tracking-[0.3em] opacity-70"
          style={{ animationDelay: "1.3s" }}
        >
          Pastries &amp; Specialty Coffee
        </p>
      </div>

      <p
        className="welcome-tagline cx-rise mx-auto mb-0 mt-8 max-w-[340px] text-[0.95rem] font-medium leading-relaxed opacity-80"
        style={{ animationDelay: "1.5s" }}
      >
        Order at your table, customize your drink, and chat with our staff — all
        in one place.
      </p>

      <div className="feature-grid mt-7 flex max-w-[400px] flex-wrap justify-center gap-2.5">
        {FEATURES.map((feature, index) => (
          <span
            className="feature-pill cx-rise rounded-full border border-[color-mix(in_srgb,currentColor_20%,transparent)] px-4 py-2 text-[0.8rem] font-semibold transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,currentColor_45%,transparent)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)]"
            style={{ animationDelay: `${1.7 + index * 0.1}s` }}
            key={feature}
          >
            {feature}
          </span>
        ))}
      </div>

      <p
        className="welcome-footer cx-rise mb-0 mt-8 text-[0.75rem] font-medium opacity-55"
        style={{ animationDelay: "2.2s" }}
      >
        Freshly baked every morning · Open daily 7 AM – 9 PM
      </p>

      <button
        className="skip-link cx-rise mt-6 cursor-pointer rounded-full border-0 px-5 py-2 text-[0.85rem] font-bold underline decoration-transparent underline-offset-4 transition hover:decoration-current"
        style={{ animationDelay: "2.4s" }}
        onClick={onContinue}
      >
        Skip now
      </button>

      <div
        className="pagination-dots cx-rise mt-5 flex items-center justify-center gap-2"
        style={{ animationDelay: "2.5s" }}
      >
        <i className="active block h-2 w-6 rounded-full bg-current opacity-80" />
        <i className="block h-2 w-2 rounded-full bg-current opacity-25" />
        <i className="block h-2 w-2 rounded-full bg-current opacity-25" />
      </div>
    </section>
  );
}
