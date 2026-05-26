import { LogIn } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createParticipant, getSessionByCode } from "../api/client.js";
import { useAudienceSessionStore } from "../store/session.js";

export function Join() {
  const navigate = useNavigate();
  const { code } = useParams();
  const setAudienceSession = useAudienceSessionStore((state) => state.setAudienceSession);
  const [joinCode, setJoinCode] = useState(code ?? "");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (code) setJoinCode(code);
  }, [code]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsJoining(true);

    try {
      const session = await getSessionByCode(joinCode.trim().toUpperCase());
      if (session.status === "ENDED") {
        setError("This session has already ended.");
        return;
      }

      const participant = await createParticipant(session.id, nickname.trim());
      setAudienceSession(session, participant.id, participant.nickname);
      window.localStorage.setItem(
        "loudroom-audience-session",
        JSON.stringify({ session, participantId: participant.id, nickname: participant.nickname }),
      );
      navigate(`/audience/sessions/${session.id}`);
    } catch {
      setError("Could not join. Check the code and nickname.");
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <main className="screen auth-screen">
      <section className="panel auth-panel">
        <div>
          <p className="eyebrow">Audience</p>
          <h1>Join Loudroom</h1>
          <p className="muted">Enter the session code from the presenter screen.</p>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label>
            Session code
            <input
              required
              autoCapitalize="characters"
              maxLength={12}
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="ABC123"
            />
          </label>
          <label>
            Nickname
            <input
              required
              maxLength={40}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Ahmet"
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary-button" disabled={isJoining} type="submit">
            <LogIn size={18} />
            {isJoining ? "Joining..." : "Join session"}
          </button>
        </form>
      </section>
    </main>
  );
}
