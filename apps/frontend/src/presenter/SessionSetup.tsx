import { Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { Poll, PollType } from "../../../../packages/types/src/poll.js";
import { createPoll } from "../api/client.js";

type OptionDraft = {
  id: string;
  text: string;
};

type SessionSetupProps = {
  sessionId: string;
  polls: Poll[];
  onPollCreated: (poll: Poll) => void;
};

function createOptionDraft(): OptionDraft {
  return { id: crypto.randomUUID(), text: "" };
}

export function SessionSetup({ sessionId, polls, onPollCreated }: SessionSetupProps) {
  const [question, setQuestion] = useState("");
  const [type, setType] = useState<PollType>("MULTIPLE_CHOICE");
  const [options, setOptions] = useState<OptionDraft[]>([createOptionDraft(), createOptionDraft()]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanOptions = options.map((option) => option.text.trim()).filter(Boolean);
    if (question.trim().length === 0 || cleanOptions.length < 2) {
      setError("Add a question and at least two options.");
      return;
    }

    setIsCreating(true);
    setError("");
    try {
      const poll = await createPoll(sessionId, {
        question: question.trim(),
        type,
        options: cleanOptions.map((text) => ({ text })),
        ...(type === "QUIZ"
          ? { correctOptionIndex: Math.min(correctOptionIndex, cleanOptions.length - 1) }
          : {}),
      });
      onPollCreated(poll);
      setQuestion("");
      setOptions([createOptionDraft(), createOptionDraft()]);
      setCorrectOptionIndex(0);
      setType("MULTIPLE_CHOICE");
    } catch {
      setError("Could not create poll.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className="panel stack">
      <div>
        <h2>Poll setup</h2>
        <p className="muted">Create simple multiple-choice polls or quizzes for this session.</p>
      </div>

      <form className="stack" onSubmit={handleSubmit}>
        <div className="segmented-control">
          <button
            className={type === "MULTIPLE_CHOICE" ? "active" : ""}
            type="button"
            onClick={() => setType("MULTIPLE_CHOICE")}
          >
            Poll
          </button>
          <button
            className={type === "QUIZ" ? "active" : ""}
            type="button"
            onClick={() => setType("QUIZ")}
          >
            Quiz
          </button>
        </div>

        <label>
          Question
          <textarea
            required
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Which feature should we demo first?"
          />
        </label>

        <div className="stack">
          {options.map((option, index) => (
            <div className="option-editor" key={option.id}>
              {type === "QUIZ" ? (
                <input
                  aria-label={`Mark option ${index + 1} as correct`}
                  checked={correctOptionIndex === index}
                  name="correct-option"
                  type="radio"
                  onChange={() => setCorrectOptionIndex(index)}
                />
              ) : null}
              <input
                required={index < 2}
                value={option.text}
                onChange={(event) =>
                  setOptions((current) =>
                    current.map((currentOption, currentIndex) =>
                      currentIndex === index
                        ? { ...currentOption, text: event.target.value }
                        : currentOption,
                    ),
                  )
                }
                placeholder={`Option ${index + 1}`}
              />
              <button
                className="icon-button"
                disabled={options.length <= 2}
                type="button"
                onClick={() =>
                  setOptions((current) =>
                    current.filter((_, currentIndex) => currentIndex !== index),
                  )
                }
                aria-label={`Remove option ${index + 1}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="button-row">
          <button
            className="secondary-button"
            disabled={options.length >= 6}
            type="button"
            onClick={() => setOptions((current) => [...current, createOptionDraft()])}
          >
            <Plus size={16} />
            Add option
          </button>
          <button className="primary-button" disabled={isCreating} type="submit">
            {isCreating ? "Saving..." : "Save poll"}
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </form>

      <div className="list compact-list">
        {polls.map((poll) => (
          <div className="plain-row" key={poll.id}>
            <span>
              <strong>{poll.question}</strong>
              <small>{poll.options.length} options</small>
            </span>
            <span className="status-pill">{poll.type === "QUIZ" ? "QUIZ" : "POLL"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
