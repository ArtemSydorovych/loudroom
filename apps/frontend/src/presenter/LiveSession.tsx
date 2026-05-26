import { ArrowLeft, Play, QrCode, Radio, Square, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { Link, useParams } from "react-router-dom";
import type { Question } from "../../../../packages/types/src/participant.js";
import type { Poll } from "../../../../packages/types/src/poll.js";
import type { Session } from "../../../../packages/types/src/session.js";
import { createParticipant, getSession, listPolls, updateSessionStatus } from "../api/client.js";
import { LoadingScreen } from "../components/LoadingScreen.js";
import { useSocket } from "../hooks/useSocket.js";
import { SessionSetup } from "./SessionSetup.js";

type LiveQuestion = Pick<Question, "id" | "text" | "participantId"> & {
  approved?: boolean;
};

export function LiveSession() {
  const { id } = useParams();
  const socket = useSocket();
  const [session, setSession] = useState<Session | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [activePollId, setActivePollId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, number>>({});
  const [participantCount, setParticipantCount] = useState(0);
  const [questions, setQuestions] = useState<LiveQuestion[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [presenterParticipantId, setPresenterParticipantId] = useState<string | null>(null);

  const joinUrl = session ? `${window.location.origin}/join/${session.joinCode}` : "";
  const activePoll = polls.find((poll) => poll.id === activePollId) ?? null;

  const resultRows = useMemo(() => {
    if (!activePoll) return [];
    return activePoll.options.map((option) => ({
      id: option.id,
      text: option.text,
      count: results[option.id] ?? 0,
    }));
  }, [activePoll, results]);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setIsLoading(true);
      setError("");
      try {
        const [nextSession, nextPolls] = await Promise.all([getSession(id), listPolls(id)]);
        setSession(nextSession);
        setPolls(nextPolls);
      } catch {
        setError("Could not load this session.");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [id]);

  useEffect(() => {
    async function joinPresenterToRoom() {
      if (!session || presenterParticipantId) return;
      try {
        const participant = await createParticipant(session.id, "Presenter");
        setPresenterParticipantId(participant.id);
        socket.emit("joinSession", {
          sessionId: session.id,
          participantId: participant.id,
          nickname: "Presenter",
        });
      } catch {
        setError("Live updates could not be connected.");
      }
    }

    void joinPresenterToRoom();
  }, [presenterParticipantId, session, socket]);

  useEffect(() => {
    const handleVoteUpdate = (nextResults: Record<string, number>) => setResults(nextResults);
    const handleParticipantCount = (count: number) => setParticipantCount(count);
    const handleQuestion = (question: LiveQuestion) =>
      setQuestions((current) => {
        if (current.some((item) => item.id === question.id)) return current;
        return [{ ...question, approved: false }, ...current];
      });
    const handlePollEnded = (payload: { counts: Record<string, number> }) =>
      setResults(payload.counts);
    const handleSocketError = (message: string) => setError(`Socket error: ${message}`);

    socket.on("voteUpdate", handleVoteUpdate);
    socket.on("participantCountUpdate", handleParticipantCount);
    socket.on("questionReceived", handleQuestion);
    socket.on("pollEnded", handlePollEnded);
    socket.on("error", handleSocketError);

    return () => {
      socket.off("voteUpdate", handleVoteUpdate);
      socket.off("participantCountUpdate", handleParticipantCount);
      socket.off("questionReceived", handleQuestion);
      socket.off("pollEnded", handlePollEnded);
      socket.off("error", handleSocketError);
    };
  }, [socket]);

  async function handleStatus(status: Session["status"]) {
    if (!session) return;
    const nextSession = await updateSessionStatus(session.id, status);
    setSession(nextSession);
  }

  async function handleStartPoll(poll: Poll) {
    if (session?.status === "WAITING") {
      await handleStatus("ACTIVE");
    }
    setActivePollId(poll.id);
    setResults({});
    socket.emit("startPoll", { pollId: poll.id });
  }

  function handleEndPoll() {
    if (!activePollId) return;
    socket.emit("endPoll", { pollId: activePollId });
  }

  function handleApproveQuestion(questionId: string) {
    socket.emit("approveQuestion", { questionId });
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId ? { ...question, approved: true } : question,
      ),
    );
  }

  if (isLoading) return <LoadingScreen />;

  if (!session || error.startsWith("Could not load")) {
    return (
      <main className="screen center-screen">
        <section className="panel compact-panel">
          <p className="error-text">{error || "Session was not found."}</p>
          <Link className="secondary-button" to="/dashboard">
            Back to dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="screen">
      <header className="topbar">
        <div>
          <Link className="back-link" to="/dashboard">
            <ArrowLeft size={16} />
            Dashboard
          </Link>
          <h1>{session.title}</h1>
          <p className="muted">Session code {session.joinCode}</p>
        </div>
        <div className="topbar-actions">
          <span className={`status-pill ${session.status.toLowerCase()}`}>
            <Radio size={14} />
            {session.status}
          </span>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void handleStatus("ENDED")}
          >
            End session
          </button>
        </div>
      </header>

      {error ? <p className="notice">{error}</p> : null}

      <section className="grid three-columns">
        <section className="panel stack qr-panel">
          <div className="section-heading">
            <div>
              <h2>Join</h2>
              <p className="muted">Share this code or QR with the audience.</p>
            </div>
            <QrCode size={20} />
          </div>
          <div className="join-code">{session.joinCode}</div>
          <div className="qr-box">
            <QRCode value={joinUrl} size={144} />
          </div>
          <a className="muted link-text" href={joinUrl}>
            {joinUrl}
          </a>
          <span className="user-pill">
            <Users size={16} />
            {participantCount} connected
          </span>
        </section>

        <SessionSetup
          sessionId={session.id}
          polls={polls}
          onPollCreated={(poll) => setPolls((current) => [...current, poll])}
        />

        <section className="panel stack">
          <div>
            <h2>Live control</h2>
            <p className="muted">Start a saved poll and watch responses update.</p>
          </div>
          <div className="list compact-list">
            {polls.map((poll) => (
              <button
                className={`poll-control ${activePollId === poll.id ? "selected" : ""}`}
                key={poll.id}
                type="button"
                onClick={() => void handleStartPoll(poll)}
              >
                <span>
                  <strong>{poll.question}</strong>
                  <small>{poll.type === "QUIZ" ? "Quiz" : "Poll"}</small>
                </span>
                <Play size={17} />
              </button>
            ))}
          </div>
          <button
            className="secondary-button"
            disabled={!activePollId}
            type="button"
            onClick={handleEndPoll}
          >
            <Square size={16} />
            End active poll
          </button>

          <div className="results">
            {resultRows.map((row) => (
              <div className="result-row" key={row.id}>
                <span>{row.text}</span>
                <strong>{row.count}</strong>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="panel stack">
        <div>
          <h2>Audience questions</h2>
          <p className="muted">Answer questions out loud, then mark them as handled.</p>
        </div>
        {questions.length === 0 ? <p className="muted">No questions yet.</p> : null}
        <div className="list">
          {questions.map((question) => (
            <div className="question-row" key={question.id}>
              <p>{question.text}</p>
              <button
                className="secondary-button"
                disabled={question.approved}
                type="button"
                onClick={() => handleApproveQuestion(question.id)}
              >
                {question.approved ? "Handled" : "Mark handled"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
