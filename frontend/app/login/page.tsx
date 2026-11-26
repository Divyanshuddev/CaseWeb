"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, KeyRound } from "lucide-react";
import { authApi, extractApiError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { RedPushpin } from "@/components/ui/RedPushpin";

const loginSchema = z.object({
  email_or_username: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const pushToast = useToastStore((s) => s.push);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError("");
    try {
      const res = await authApi.login(values);
      setAuth(res.access_token, res.user);
      pushToast({
        type: "success",
        title: "Welcome back, Investigator",
        description: `Signed in as ${res.user.username}`,
      });
      router.push("/dashboard");
    } catch (err) {
      setServerError(extractApiError(err, "Unable to verify credentials."));
    }
  };

  return (
    <div className="min-h-screen corkboard-surface flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 desk-lamp-glow pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-typewriter uppercase tracking-wider text-paper hover:text-cream mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Investigation Room
        </Link>

        <div className="vintage-paper rounded-sm border border-[#7b6244] shadow-2xl p-7 relative">
          <div className="flex justify-center -mt-10 mb-4">
            <RedPushpin size="lg" />
          </div>

          <div className="text-center mb-6">
            <p className="text-[11px] font-typewriter uppercase tracking-[0.25em] text-[#6d5438]">
              CaseWeb Bureau Access
            </p>
            <h1 className="font-serifVintage text-2xl font-bold text-[#1a1510] mt-1">
              Investigator Sign In
            </h1>
          </div>

          {serverError && (
            <div className="mb-4 p-3 bg-blood-red/15 border border-blood-red text-blood-red text-xs rounded-sm font-medium">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-typewriter uppercase tracking-wider text-[#3b2f21] mb-1">
                Username or Email
              </label>
              <input
                {...register("email_or_username")}
                className="w-full px-3 py-2.5 bg-[#f5ebd8] border border-[#8c7353] rounded-sm text-sm text-[#1a1510] focus:outline-none focus:border-blood-red"
                placeholder="detective.mercer"
              />
              {errors.email_or_username && (
                <p className="text-xs text-blood-red mt-1">{errors.email_or_username.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-typewriter uppercase tracking-wider text-[#3b2f21] mb-1">
                Passphrase
              </label>
              <input
                type="password"
                {...register("password")}
                className="w-full px-3 py-2.5 bg-[#f5ebd8] border border-[#8c7353] rounded-sm text-sm text-[#1a1510] focus:outline-none focus:border-blood-red"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-xs text-blood-red mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-blood-red hover:bg-[#991e25] text-cream font-typewriter text-sm uppercase tracking-wider rounded-sm transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <KeyRound className="w-4 h-4" />
              {isSubmitting ? "Verifying Credentials..." : "Enter Investigation Room"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#bfa682] flex items-center justify-between text-xs text-[#4b3c2b]">
            <span>New investigator?</span>
            <Link href="/register" className="font-semibold text-blood-red hover:underline">
              Open a New Badge →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
