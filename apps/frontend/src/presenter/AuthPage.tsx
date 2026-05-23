import { LogIn, UserPlus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

type AuthMode = "signin" | "signup";

export function AuthPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        await register(name.trim() || email.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      navigate("/dashboard");
    } catch {
      setError("Could not authenticate. Check the details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="screen auth-screen">
      <section className="panel auth-panel">
        <div>
          <p className="eyebrow">Loudroom presenter</p>
          <h1>{mode === "signup" ? "Create account" : "Sign in"}</h1>
          <p className="muted">Manage sessions, polls, live votes, and audience questions.</p>
        </div>

        <div className="segmented-control" aria-label="Authentication mode">
          <button
            className={mode === "signin" ? "active" : ""}
            type="button"
            onClick={() => setMode("signin")}
          >
            <LogIn size={16} />
            Sign in
          </button>
          <button
            className={mode === "signup" ? "active" : ""}
            type="button"
            onClick={() => setMode("signup")}
          >
            <UserPlus size={16} />
            Sign up
          </button>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <label>
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
              />
            </label>
          ) : null}
          <label>
            Email
            <input
              required
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              required
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={8}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 8 characters"
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
