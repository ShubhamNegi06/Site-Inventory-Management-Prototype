"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/Spinner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Email or password is incorrect.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: brand panel -- signature element is the specimen grid pattern */}
      <div className="relative hidden w-1/2 flex-col justify-between border-r border-line bg-sidebar px-12 py-10 text-ink lg:flex">
        <div>
          <img
            src="https://clinvedica.com/logo.png"
            alt="Clin Vedica Life Sciences"
            className="h-14 w-auto max-w-full object-contain"
          />
          <div className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-ink-400">
            Specimen Inventory
          </div>
        </div>
        <div>
          <h1 className="max-w-sm text-3xl font-semibold leading-tight text-ink">
            Every block, every site, one register.
          </h1>
          <p className="mt-3 max-w-sm text-sm text-ink-400">
            Track FFPE and frozen tumor blocks from collection to consolidation,
            across every contributing site.
          </p>
        </div>
        <SpecimenGrid />
      </div>

      {/* Right: form */}
      <div className="flex w-full flex-col items-center justify-center bg-paper px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <img
              src="https://clinvedica.com/logo.png"
              alt="Clin Vedica Life Sciences"
              className="h-12 w-auto max-w-full object-contain"
            />
            <div className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-400">
              Specimen Inventory
            </div>
          </div>
          <h2 className="text-xl font-semibold text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-ink-400">
            Use the credentials your administrator provided.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-400 hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded border border-danger/30 bg-dangerSoft px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Spinner className="border-white/30 border-t-white" /> : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SpecimenGrid() {
  // 5x3 grid of small labeled tiles -- echoes a slide tray / block storage rack.
  const codes = ["A1", "A2", "A3", "A4", "A5", "B1", "B2", "B3", "B4", "B5", "C1", "C2", "C3", "C4", "C5"];
  return (
    <div className="grid grid-cols-5 gap-1.5 opacity-80">
      {codes.map((c) => (
        <div
          key={c}
          className="h-9 w-9 rounded-sm border border-ink-100"
        />
      ))}
    </div>
  );
}
