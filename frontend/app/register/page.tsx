"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { authApi, extractApiError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { RedPushpin } from "@/components/ui/RedPushpin";

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "At least 3 characters")
    .max(64)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Letters, numbers, _, ., - only"),
  email: z.string().email("Enter a valid email address"),
  full_name: z.string().max(120).optional(),
  badge_number: z.string().max(40).optional(),
  password: z.string().min(8, "Minimum 8 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const pushToast = useToastStore((s) => s.push);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError("");
    try {
      const res = await authApi.register(values);
      setAuth(res.access_token, res.user);
      pushToast({
        type: "success",
        title: "Badge issued",
        description: "Your private investigation room is ready.",
      });
      router.push("/dashboard");
    } catch (err) {
      setServerError(extractApiError(err, "Registration failed."));
    }
  };

  return (
    <div className="min-h-screen corkboard-surface flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 desk-lamp-glow pointer-events-none" />
      <div className="w-full max-w-lg relative z-10">
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
              Fictional Mystery Workspace
            </p>
            <h1 className="font-serifVintage text-2xl font-bold text-[#1a1510] mt-1">
              Register Investigator Profile
            </h1>
          </div>

          {serverError && (
            <div className="mb-4 p-3 bg-blood-red/15 border border-blood-red text-blood-red text-xs rounded-sm font-medium">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-typewriter uppercase tracking-wider text-[#3b2f21] mb-1">
                  Username *
                </label>
                <input
                  {...register("username")}
                  className="w-full px-3 py-2 bg-[#f5ebd8] border border-[#8c7353] rounded-sm text-sm text-[#1a1510] focus:outline-none focus:border-blood-red"
                  placeholder="det_mercer"
                />
                {errors.username && (
                  <p className="text-xs text-blood-red mt-1">{errors.username.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-typewriter uppercase tracking-wider text-[#3b2f21] mb-1">
                  Badge ID (Optional)
                </label>
                <input
                  {...register("badge_number")}
                  className="w-full px-3 py-2 bg-[#f5ebd8] border border-[#8c7353] rounded-sm text-sm text-[#1a1510] focus:outline-none focus:border-blood-red"
                  placeholder="CW-1947"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-typewriter uppercase tracking-wider text-[#3b2f21] mb-1">
                Full Name
              </label>
              <input
                {...register("full_name")}
                className="w-full px-3 py-2 bg-[#f5ebd8] border border-[#8c7353] rounded-sm text-sm text-[#1a1510] focus:outline-none focus:border-blood-red"
                placeholder="Detective Helen Mercer"
              />
            </div>

            <div>
              <label className="block text-xs font-typewriter uppercase tracking-wider text-[#3b2f21] mb-1">
                Email Address *
              </label>
              <input
                type="email"
                {...register("email")}
                className="w-full px-3 py-2 bg-[#f5ebd8] border border-[#8c7353] rounded-sm text-sm text-[#1a1510] focus:outline-none focus:border-blood-red"
                placeholder="mercer@caseweb.org"
              />
              {errors.email && <p className="text-xs text-blood-red mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-typewriter uppercase tracking-wider text-[#3b2f21] mb-1">
                Passphrase (min 8 chars) *
              </label>
              <input
                type="password"
                {...register("password")}
                className="w-full px-3 py-2 bg-[#f5ebd8] border border-[#8c7353] rounded-sm text-sm text-[#1a1510] focus:outline-none focus:border-blood-red"
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
              <ShieldCheck className="w-4 h-4" />
              {isSubmitting ? "Issuing Credentials..." : "Create Investigator Account"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#bfa682] flex items-center justify-between text-xs text-[#4b3c2b]">
            <span>Already registered?</span>
            <Link href="/login" className="font-semibold text-blood-red hover:underline">
              Sign In →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
