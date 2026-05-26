import { Plus, Radio, RefreshCw, ShieldCheck } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Session } from "../../../../packages/types/src/session.js";
import { createSession, listSessions } from "../api/client.js";
import { useAuth } from "../hooks/useAuth.js";

export function Dashboard() {
  const { auth, logout } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const loadSessions = useCallback(async () => {
    setError("");
    setIsLoading(true);
    try {
      setSessions(await listSessions());
    } catch {
      setError("Could not load sessions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setIsCreating(true);
    setError("");
    try {
      const session = await createSession(trimmedTitle);
      setSessions((current) => [session, ...current]);
      setTitle("");
    } catch {
      setError("Could not create session.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="screen">
      <header className="topbar">
        <div>
          <p className="eyebrow">Presenter dashboard</p>
          <h1>Loudroom</h1>
        </div>
        <div className="topbar-actions">
          <span className="user-pill">
            <ShieldCheck size={16} />
            {auth?.user.email}
          </span>
          <button className="ghost-button" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <section className="grid two-columns">
        <form className="panel stack" onSubmit={handleCreate}>
          <div>
            <h2>Create session</h2>
            <p className="muted">
              Start with a title. Polls and QR sharing are managed inside the session.
            </p>
          </div>
          <label>
            Session title
            <input
              required
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Software Engineering demo"
            />
          </label>
          <button className="primary-button" disabled={isCreating} type="submit">
            <Plus size={18} />
            {isCreating ? "Creating..." : "Create session"}
          </button>
          {error ? <p className="error-text">{error}</p> : null}
        </form>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Your sessions</h2>
              <p className="muted">Open one to add polls and control the live room.</p>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={loadSessions}
              aria-label="Refresh sessions"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          {isLoading ? <p className="muted">Loading sessions...</p> : null}
          {!isLoading && sessions.length === 0 ? <p className="muted">No sessions yet.</p> : null}
          <div className="list">
            {sessions.map((session) => (
              <Link className="session-row" key={session.id} to={`/sessions/${session.id}`}>
                <span>
                  <strong>{session.title}</strong>
                  <small>Code {session.joinCode}</small>
                </span>
                <span className={`status-pill ${session.status.toLowerCase()}`}>
                  <Radio size={14} />
                  {session.status}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
