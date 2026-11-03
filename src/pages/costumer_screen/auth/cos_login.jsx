import { useState } from "react";
import { Icon, Logo } from "../../../components/customer_ui.jsx";

export default function CustomerLogin({ onSubmit, onSwitch }) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/customers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not sign in.");
      onSubmit(data.customer);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell flex min-h-dvh flex-col items-center justify-center px-4 py-6 font-['Plus_Jakarta_Sans',ui-sans-serif,system-ui,sans-serif] antialiased">
      <section className="auth-card w-full max-w-[420px] rounded-[24px] px-5 pb-6 pt-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.08),0_32px_64px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:px-8 sm:pb-7 sm:pt-9">
        <div className="auth-brand mb-5 flex items-center justify-center">
          <Logo />
        </div>

        <h1 className="m-0 text-center text-[1.6rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[1.9rem]">
          Welcome Back!
        </h1>
        <p className="auth-subtitle mb-7 mt-2 text-center text-[0.95rem] font-medium opacity-65">
          Sign In to continue
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
          <label className="auth-field flex flex-col gap-2">
            <span className="text-[0.8rem] font-semibold tracking-[0.01em]">
              Email:
            </span>
            <input
              name="email"
              type="email"
              placeholder="Jonhdoe@example.com"
              autoComplete="email"
              required
              className="h-[52px] w-full rounded-[14px] border-[1.5px] border-[color-mix(in_srgb,currentColor_16%,transparent)] px-4 text-[0.95rem] font-medium outline-none transition placeholder:font-normal placeholder:opacity-45 hover:border-[color-mix(in_srgb,currentColor_32%,transparent)] focus:border-[color-mix(in_srgb,currentColor_60%,transparent)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,currentColor_10%,transparent)]"
            />
          </label>

          <label className="auth-field flex flex-col gap-2">
            <span className="text-[0.8rem] font-semibold tracking-[0.01em]">
              Password:
            </span>
            <span className="password-input-wrap relative block">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="h-[52px] w-full rounded-[14px] border-[1.5px] border-[color-mix(in_srgb,currentColor_16%,transparent)] pl-4 pr-[50px] text-[0.95rem] font-medium outline-none transition placeholder:font-normal placeholder:opacity-45 hover:border-[color-mix(in_srgb,currentColor_32%,transparent)] focus:border-[color-mix(in_srgb,currentColor_60%,transparent)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,currentColor_10%,transparent)]"
              />
              <button
                className="password-toggle !absolute !inset-y-0 !right-2 !my-auto !h-9 !w-9 !translate-y-0 !transform-none grid cursor-pointer place-items-center rounded-[10px] border-0 opacity-55 transition hover:bg-[color-mix(in_srgb,currentColor_8%,transparent)] hover:opacity-100"
                type="button"
                aria-label={`${showPassword ? "Hide" : "Show"} password`}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
              </button>
            </span>
          </label>

          {error && (
            <p
              className="auth-error m-0 rounded-xl border border-[color-mix(in_srgb,currentColor_20%,transparent)] px-3.5 py-2.5 text-[0.85rem] font-medium"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className="auth-submit mt-1 h-[54px] w-full cursor-pointer rounded-2xl text-base font-bold tracking-[0.01em] transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-[0_10px_24px_rgba(0,0,0,0.18)] enabled:hover:brightness-105 enabled:active:translate-y-0 enabled:active:shadow-none disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="auth-options mt-[18px] flex items-center justify-between gap-3 text-[0.85rem] font-medium">
          <label className="remember-option inline-flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="m-0 h-4 w-4 cursor-pointer rounded-[5px]"
            />
            <span>Remember Me</span>
          </label>
          <button
            className="text-link cursor-pointer border-0 p-0 font-semibold underline decoration-transparent underline-offset-4 transition hover:decoration-current"
            type="button"
          >
            Forgot password?
          </button>
        </div>

        <p className="auth-switch mb-0 mt-5 text-center text-[0.9rem] font-medium opacity-85">
          Don&apos;t have an account?{" "}
          <button
            className="text-link cursor-pointer border-0 p-0 font-bold underline decoration-transparent underline-offset-4 transition hover:decoration-current"
            type="button"
            onClick={onSwitch}
          >
            Sign up
          </button>
        </p>

        <div className="social-divider mb-[18px] mt-6 flex items-center gap-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.1em] opacity-60">
          <span className="h-px flex-1 bg-current opacity-25" />
          or sign in with
          <span className="h-px flex-1 bg-current opacity-25" />
        </div>

        <div className="social-buttons grid grid-cols-3 gap-3">
          {["google", "apple", "facebook"].map((social) => (
            <button
              type="button"
              aria-label={`Continue with ${social}`}
              key={social}
              className="grid h-[50px] cursor-pointer place-items-center rounded-[14px] border-[1.5px] border-[color-mix(in_srgb,currentColor_16%,transparent)] transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,currentColor_40%,transparent)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)]"
            >
              <Icon name={social} size={19} />
            </button>
          ))}
        </div>

        <footer className="auth-footer mt-7 text-center">
          <p className="auth-est mb-0 mt-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.25em] opacity-50">
            Est. 2026
          </p>
        </footer>
      </section>
    </div>
  );
}
