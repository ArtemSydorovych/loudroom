export interface ClientToServerEvents {
  joinSession: (data: { sessionId: string; participantId: string; nickname: string }) => void;
  startPoll: (data: { pollId: string }) => void;
  endPoll: (data: { pollId: string }) => void;
  vote: (data: { pollId: string; optionId: string; participantId: string }) => void;
  submitQuestion: (data: { sessionId: string; participantId: string; text: string }) => void;
  approveQuestion: (data: { questionId: string }) => void;
}

export interface ServerToClientEvents {
  sessionJoined: (session: { id: string; title: string; status: string }) => void;
  participantCountUpdate: (count: number) => void;
  pollStarted: (poll: {
    id: string;
    question: string;
    options: Array<{ id: string; text: string }>;
    timeLimitSeconds?: number;
  }) => void;
  voteUpdate: (results: Record<string, number>) => void;
  pollEnded: (results: { counts: Record<string, number>; correctOptionId?: string }) => void;
  leaderboardUpdate: (participants: Array<{ nickname: string; score: number }>) => void;
  questionReceived: (question: { id: string; text: string; participantId: string }) => void;
  error: (message: string) => void;
}
