"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (userId: string, token: string) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    displayName: "",
  });

  if (!isOpen) return null;

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const url = `${API_BASE}/auth/${mode}`;
      const body = mode === "login"
        ? { email: formData.email, password: formData.password }
        : {
            email: formData.email,
            password: formData.password,
            username: formData.username,
            displayName: formData.displayName || formData.username,
          };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Failed to ${mode}`);
      }

      // Success
      if (onSuccess && data.userId) {
        onSuccess(data.userId, data.token || "");
        onClose();
        // Reset form
        setFormData({
          email: "",
          password: "",
          username: "",
          displayName: "",
        });
      }
    } catch (err: any) {
      setError(err.message || `An error occurred during ${mode}`);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
    setFormData({
      email: "",
      password: "",
      username: "",
      displayName: "",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-zinc-900 rounded-lg border border-zinc-800 w-full max-w-md mx-4 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {mode === "login" ? "Login" : "Create Account"}
          </h2>
          <p className="text-sm text-zinc-400">
            {mode === "login"
              ? "Welcome back! Please login to your account."
              : "Join Fun Gaming Platform and start playing!"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="Choose a username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="Your display name"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder={mode === "login" ? "Enter your password" : "At least 6 characters"}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-md text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent text-black font-semibold rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-400">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                onClick={switchMode}
                className="text-accent hover:underline font-medium"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={switchMode}
                className="text-accent hover:underline font-medium"
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

