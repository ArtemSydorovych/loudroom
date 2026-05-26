import { create } from "zustand";
import type { Session } from "../../../../packages/types/src/session.js";

type AudienceState = {
  session: Pick<Session, "id" | "title" | "status" | "joinCode"> | null;
  participantId: string | null;
  nickname: string;
  setAudienceSession: (
    session: Pick<Session, "id" | "title" | "status" | "joinCode">,
    participantId: string,
    nickname: string,
  ) => void;
  clearAudienceSession: () => void;
};

export const useAudienceSessionStore = create<AudienceState>((set) => ({
  session: null,
  participantId: null,
  nickname: "",
  setAudienceSession: (session, participantId, nickname) =>
    set({ session, participantId, nickname }),
  clearAudienceSession: () => set({ session: null, participantId: null, nickname: "" }),
}));
