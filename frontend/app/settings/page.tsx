"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Save, UserCog } from "lucide-react";
import { authApi, extractApiError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { WorkspaceShell } from "@/components/ui/WorkspaceShell";

const profileSchema = z.object({
  username: z.string().min(3).max(64),
  email: z.string().email(),
  full_name: z.string().max(120).optional(),
  badge_number: z.string().max(40).optional(),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    confirm_password: z.string().min(8),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export default function SettingsPage() {
  const { user, setUser, initialized } = useAuthStore();
  const pushToast = useToastStore((s) => s.push);

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        username: user.username,
        email: user.email,
        full_name: user.full_name || "",
        badge_number: user.badge_number || "",
      });
    }
  }, [user, profileForm]);

  const onSaveProfile = async (values: z.infer<typeof profileSchema>) => {
    try {
      const updated = await authApi.updateProfile(values);
      setUser(updated);
      pushToast({ type: "success", title: "Investigator profile updated" });
    } catch (err) {
      pushToast({ type: "error", title: "Profile update failed", description: extractApiError(err) });
    }
  };

  const onUpdatePassword = async (values: z.infer<typeof passwordSchema>) => {
    try {
      await authApi.updatePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      passwordForm.reset();
      pushToast({ type: "success", title: "Passphrase updated securely" });
    } catch (err) {
      pushToast({ type: "error", title: "Password change failed", description: extractApiError(err) });
    }
  };

  return (
    <WorkspaceShell>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
        <div className="border-b border-[#2e261f] pb-4">
          <p className="font-typewriter text-xs uppercase tracking-[0.22em] text-blood-red">
            Bureau Credentials
          </p>
          <h1 className="font-serifVintage text-3xl font-bold text-cream mt-1">
            Investigator Settings
          </h1>
        </div>

        {!initialized ? (
          <div className="h-48 bg-[#1b1815] animate-pulse rounded-sm" />
        ) : !user ? (
          <div className="bg-[#1b1815] border border-[#352b22] rounded-sm p-6 text-center space-y-3">
            <p className="text-sm text-paper">Sign in to manage your investigator profile and passphrase.</p>
            <Link
              href="/login"
              className="inline-block px-5 py-2 bg-blood-red text-cream text-xs font-typewriter uppercase rounded-sm"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Form */}
            <form
              onSubmit={profileForm.handleSubmit(onSaveProfile)}
              className="bg-[#1b1815] border border-[#352b22] rounded-sm p-6 space-y-4"
            >
              <div className="flex items-center gap-2 text-paper mb-2">
                <UserCog className="w-5 h-5 text-blood-red" />
                <h2 className="font-serifVintage text-xl font-bold text-cream">Profile Details</h2>
              </div>

              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Username
                </label>
                <input
                  {...profileForm.register("username")}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
                {profileForm.formState.errors.username && (
                  <p className="text-xs text-blood-red mt-1">
                    {profileForm.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  {...profileForm.register("email")}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
                {profileForm.formState.errors.email && (
                  <p className="text-xs text-blood-red mt-1">
                    {profileForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Full Name
                </label>
                <input
                  {...profileForm.register("full_name")}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
              </div>

              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Badge Number
                </label>
                <input
                  {...profileForm.register("badge_number")}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
              </div>

              <button
                type="submit"
                disabled={profileForm.formState.isSubmitting}
                className="w-full py-2.5 bg-blood-red hover:bg-[#991e25] text-cream font-typewriter text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {profileForm.formState.isSubmitting ? "Saving..." : "Save Profile"}
              </button>
            </form>

            {/* Password Form */}
            <form
              onSubmit={passwordForm.handleSubmit(onUpdatePassword)}
              className="bg-[#1b1815] border border-[#352b22] rounded-sm p-6 space-y-4"
            >
              <div className="flex items-center gap-2 text-paper mb-2">
                <KeyRound className="w-5 h-5 text-blood-red" />
                <h2 className="font-serifVintage text-xl font-bold text-cream">Update Passphrase</h2>
              </div>

              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  {...passwordForm.register("current_password")}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
                {passwordForm.formState.errors.current_password && (
                  <p className="text-xs text-blood-red mt-1">
                    {passwordForm.formState.errors.current_password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  {...passwordForm.register("new_password")}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
                {passwordForm.formState.errors.new_password && (
                  <p className="text-xs text-blood-red mt-1">
                    {passwordForm.formState.errors.new_password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  {...passwordForm.register("confirm_password")}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
                {passwordForm.formState.errors.confirm_password && (
                  <p className="text-xs text-blood-red mt-1">
                    {passwordForm.formState.errors.confirm_password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={passwordForm.formState.isSubmitting}
                className="w-full py-2.5 bg-[#2a221b] hover:bg-[#382d24] border border-[#5a4733] text-cream font-typewriter text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                {passwordForm.formState.isSubmitting ? "Updating..." : "Change Password"}
              </button>
            </form>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
