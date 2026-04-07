export type PollType = "MULTIPLE_CHOICE" | "QUIZ";

export interface PollOption {
  id: string;
  pollId: string;
  text: string;
  orderIndex: number;
}

export interface Poll {
  id: string;
  sessionId: string;
  question: string;
  type: PollType;
  orderIndex: number;
  timeLimitSeconds: number | null;
  correctOptionId: string | null;
  createdAt: string;
  options: PollOption[];
}

export interface Vote {
  id: string;
  pollId: string;
  optionId: string;
  participantId: string;
  submittedAt: string;
}
