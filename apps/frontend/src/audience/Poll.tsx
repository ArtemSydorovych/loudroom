import { Send } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSocket } from "../hooks/useSocket.js";
import { useAudienceSessionStore } from "../store/session.js";
import { Waiting } from "./Waiting.js";

type ActivePoll = {
  id: string;
  question: string;
  options: Array<{ id: string; text: string }>;
  timeLimitSeconds?: number;
};

type StoredAudienceSession = {
  session: {
    id: string;
    title: string;
    status: "WAITING" | "ACTIVE" | "ENDED";
    joinCode: string;
  };
  participantId: string;
  nickname: string;
};

const socketErrorMessages: Record<string, string> = {
  internal_error: "Something went wrong. Try refreshing the page.",
  not_in_session: "You are not connected to this session anymore.",
  participant_not_in_session: "Your audience connection is no longer valid. Please join again.",
  session_ended: "This session has ended.",
  session_not_found: "This session could not be found.",
};

export function Poll() {
  const { id } = useParams();
  const socket = useSocket();
  const store = useAudienceSessionStore();
  const [activePoll, setActivePoll] = useState<ActivePoll | null>(null);
  const [results, setResults] = useState<Record<string, number>>({});
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [question, setQuestion] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (store.session && store.participantId) return;
    const saved = window.localStorage.getItem("loudroom-audience-session");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as StoredAudienceSession;
      if (parsed.session.id === id) {
        store.setAudienceSession(parsed.session, parsed.participantId, parsed.nickname);
      }
    } catch {
      window.localStorage.removeItem("loudroom-audience-session");
    }
  }, [id, store]);

  useEffect(() => {
    if (!store.session || !store.participantId || !store.nickname) return;

    socket.emit("joinSession", {
      sessionId: store.session.id,
      participantId: store.participantId,
      nickname: store.nickname,
    });
  }, [socket, store.nickname, store.participantId, store.session]);

  useEffect(() => {
    const handlePollStarted = (poll: ActivePoll) => {
      setActivePoll(poll);
      setSelectedOptionId("");
      setHasVoted(false);
      setResults({});
      setNotice("");
    };
    const handleVoteUpdate = (nextResults: Record<string, number>) => setResults(nextResults);
    const handlePollEnded = (payload: { counts: Record<string, number> }) => {
      setResults(payload.counts);
      setNotice("Poll ended. Results are final.");
    };
    const handleError = (message: string) =>
      setNotice(socketErrorMessages[message] ?? "Live connection error. Try refreshing the page.");

    socket.on("pollStarted", handlePollStarted);
    socket.on("voteUpdate", handleVoteUpdate);
    socket.on("pollEnded", handlePollEnded);
    socket.on("error", handleError);

    return () => {
      socket.off("pollStarted", handlePollStarted);
      socket.off("voteUpdate", handleVoteUpdate);
      socket.off("pollEnded", handlePollEnded);
      socket.off("error", handleError);
    };
  }, [socket]);

  const totalVotes = useMemo(
    () => Object.values(results).reduce((total, count) => total + count, 0),
    [results],
  );

  function handleVote(optionId: string) {
    if (!activePoll || !store.participantId || hasVoted) return;
    setSelectedOptionId(optionId);
    setHasVoted(true);
    socket.emit("vote", {
      pollId: activePoll.id,
      optionId,
      participantId: store.participantId,
    });
  }

  function handleQuestionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!store.session || !store.participantId || question.trim().length === 0) return;

    socket.emit("submitQuestion", {
      sessionId: store.session.id,
      participantId: store.participantId,
      text: question.trim(),
    });
    setQuestion("");
    setNotice("Question sent.");
  }

  if (!store.session || !store.participantId) {
    return (
      <main className="screen center-screen">
        <section className="panel compact-panel">
          <p className="muted">Join a session first.</p>
          <Link className="primary-button" to="/join">
            Go to join page
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="screen audience-screen">
      <header className="topbar">
        <div>
          <p className="eyebrow">Audience</p>
          <h1>{store.session.title}</h1>
        </div>
        <span className="user-pill">{store.nickname}</span>
      </header>

      <section className="grid two-columns">
        <div>
          {!activePoll ? (
            <Waiting title={store.session.title} nickname={store.nickname} />
          ) : (
            <section className="panel stack">
              <div>
                <p className="eyebrow">Live poll</p>
                <h2>{activePoll.question}</h2>
                {activePoll.timeLimitSeconds ? (
                  <p className="muted">{activePoll.timeLimitSeconds} seconds</p>
                ) : null}
              </div>

              <div className="answer-list">
                {activePoll.options.map((option) => {
                  const count = results[option.id] ?? 0;
                  const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  return (
                    <button
                      className={`answer-button ${selectedOptionId === option.id ? "selected" : ""}`}
                      disabled={hasVoted}
                      key={option.id}
                      type="button"
                      onClick={() => handleVote(option.id)}
                    >
                      <span>{option.text}</span>
                      <strong>{hasVoted || notice.includes("ended") ? `${percent}%` : ""}</strong>
                    </button>
                  );
                })}
              </div>
              {hasVoted ? <p className="muted">Vote submitted. Watching live results.</p> : null}
            </section>
          )}
        </div>

        <section className="panel stack">
          <div>
            <h2>Ask a question</h2>
            <p className="muted">Send a short question to the presenter.</p>
          </div>
          <form className="stack" onSubmit={handleQuestionSubmit}>
            <textarea
              maxLength={500}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Type your question..."
            />
            <button className="primary-button" type="submit">
              <Send size={17} />
              Send question
            </button>
          </form>
          {notice ? <p className="notice">{notice}</p> : null}
        </section>
      </section>
    </main>
  );
}
