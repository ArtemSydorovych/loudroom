import type { ReactNode } from "react";

type QuizProps = {
  children: ReactNode;
};

export function Quiz({ children }: QuizProps) {
  return <>{children}</>;
}
