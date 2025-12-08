"use client";

import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (userId: string, token: string) => void;
  initialMode?: "login" | "register";
}

export function AuthModal({ isOpen, onClose, onSuccess, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    displayName: "",
  });

  // Update mode when initialMode prop changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Client-side validation
      if (mode === "register") {
        if (!formData.username || formData.username.length < 3) {
          setError("Username must be at least 3 characters");
          setLoading(false);
          return;
        }
        if (!formData.email || !formData.email.includes("@")) {
          setError("Please enter a valid email address");
          setLoading(false);
          return;
        }
        if (!formData.password || formData.password.length < 6) {
          setError("Password must be at least 6 characters");
          setLoading(false);
          return;
        }
        // Validate username format
        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
        if (!usernameRegex.test(formData.username)) {
          setError("Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens");
          setLoading(false);
          return;
        }
      } else {
        // Login: accept email or username
        if (!formData.email) {
          setError("Please enter your email or username");
          setLoading(false);
          return;
        }
        if (!formData.password) {
          setError("Please enter your password");
          setLoading(false);
          return;
        }
      }

      const url = `${API_BASE}/auth/${mode}`;
      const body = mode === "login"
        ? { 
            emailOrUsername: formData.email.trim().toLowerCase(), 
            password: formData.password 
          }
        : {
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            username: formData.username.trim(),
            displayName: formData.username.trim(), // Use username with original case as displayName
          };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        // If response is not JSON, use status text
        throw new Error(res.statusText || `Failed to ${mode}`);
      }

      if (!res.ok) {
        // Handle validation errors from NestJS
        if (data.message && Array.isArray(data.message)) {
          // ValidationPipe returns array of error messages
          const errorMessages = data.message.map((msg: any) => {
            if (typeof msg === 'string') return msg;
            if (msg.constraints) {
              return Object.values(msg.constraints).join(', ');
            }
            return JSON.stringify(msg);
          }).join('. ');
          throw new Error(errorMessages);
        }
        
        // Extract error message from response
        const errorMessage = data.message || data.error || `Failed to ${mode}`;
        throw new Error(errorMessage);
      }

      // Success
      if (onSuccess && data.userId) {
        onSuccess(data.userId, data.token || "");
        // Reset form
        setFormData({
          email: "",
          password: "",
          username: "",
          displayName: "",
        });
        setError(null);
        onClose();
      }
    } catch (err: any) {
      // Handle network errors
      if (
        err.message === "Failed to fetch" || 
        err.message.includes("NetworkError") || 
        err.name === "TypeError" ||
        err.message.includes("Network request failed")
      ) {
        setError(
          `Cannot connect to the server at ${API_BASE}. ` +
          `Please ensure the backend is running. ` +
          `You can start it with: make dev-backend or make up`
        );
      } else {
        setError(err.message || `An error occurred during ${mode}`);
      }
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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center min-h-screen bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-card rounded-md w-full max-w-md p-6 shadow-2xl z-[10000]">
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
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Username
              </label>
              <input
                type="text"
                required
                minLength={3}
                autoComplete="off"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full px-4 py-2 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
                style={{ backgroundColor: "#E8F0FE" }}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              {mode === "login" ? "Username or Email" : "Email"}
            </label>
            <input
              type={mode === "login" ? "text" : "email"}
              required
              autoComplete={mode === "login" ? "username" : "email"}
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-2 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
              style={{ backgroundColor: "#E8F0FE" }}
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
              autoComplete={mode === "login" ? "off" : "new-password"}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-2 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
              style={{ backgroundColor: "#E8F0FE" }}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 rounded-md text-red-400 text-sm animate-in fade-in duration-200">
              <div className="font-semibold mb-1">Error</div>
              <div>{error}</div>
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

