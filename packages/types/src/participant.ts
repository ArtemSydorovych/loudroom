export interface Participant {
  id: string;
  sessionId: string;
  nickname: string;
  score: number;
  joinedAt: string;
}

export interface Question {
  id: string;
  sessionId: string;
  participantId: string;
  text: string;
  isApproved: boolean;
  upvotes: number;
  submittedAt: string;
}
