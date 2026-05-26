import axios from "axios";
import type { Participant } from "../../../../packages/types/src/participant.js";
import type { Poll, PollType } from "../../../../packages/types/src/poll.js";
import type { Session, SessionStatus } from "../../../../packages/types/src/session.js";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthSession = {
  id: string;
  userId: string;
  expiresAt: string | Date;
};

export type AuthState = {
  user: AuthUser;
  session: AuthSession;
};

export type CreatePollInput = {
  question: string;
  type: PollType;
  options: Array<{ text: string }>;
  timeLimitSeconds?: number;
  correctOptionIndex?: number;
};

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export async function getMe(): Promise<AuthState> {
  const { data } = await api.get<AuthState>("/me");
  return data;
}

export async function signIn(email: string, password: string): Promise<void> {
  await api.post("/auth/sign-in/email", { email, password });
}

export async function signUp(name: string, email: string, password: string): Promise<void> {
  await api.post("/auth/sign-up/email", { name, email, password });
}

export async function signOut(): Promise<void> {
  await api.post("/auth/sign-out");
}

export async function listSessions(): Promise<Session[]> {
  const { data } = await api.get<Session[]>("/sessions");
  return data;
}

export async function createSession(title: string): Promise<Session> {
  const { data } = await api.post<Session>("/sessions", { title });
  return data;
}

export async function getSession(id: string): Promise<Session> {
  const { data } = await api.get<Session>(`/sessions/${id}`);
  return data;
}

export async function updateSessionStatus(id: string, status: SessionStatus): Promise<Session> {
  const { data } = await api.patch<Session>(`/sessions/${id}/status`, { status });
  return data;
}

export async function getSessionByCode(
  code: string,
): Promise<Pick<Session, "id" | "title" | "status" | "joinCode">> {
  const { data } = await api.get<Pick<Session, "id" | "title" | "status" | "joinCode">>(
    `/sessions/by-code/${code}`,
  );
  return data;
}

export async function createParticipant(sessionId: string, nickname: string): Promise<Participant> {
  const { data } = await api.post<Participant>(`/sessions/${sessionId}/participants`, { nickname });
  return data;
}

export async function listPolls(sessionId: string): Promise<Poll[]> {
  const { data } = await api.get<Poll[]>(`/sessions/${sessionId}/polls`);
  return data;
}

export async function createPoll(sessionId: string, poll: CreatePollInput): Promise<Poll> {
  const { data } = await api.post<Poll>(`/sessions/${sessionId}/polls`, poll);
  return data;
}
