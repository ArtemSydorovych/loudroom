export type SessionStatus = "WAITING" | "ACTIVE" | "ENDED";

export interface Session {
  id: string;
  userId: string;
  joinCode: string;
  title: string;
  status: SessionStatus;
  createdAt: string;
}
