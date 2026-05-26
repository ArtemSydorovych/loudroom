import { Radio } from "lucide-react";

type WaitingProps = {
  title: string;
  nickname: string;
};

export function Waiting({ title, nickname }: WaitingProps) {
  return (
    <section className="panel compact-panel waiting-panel">
      <Radio size={28} />
      <div>
        <h1>{title}</h1>
        <p className="muted">Joined as {nickname}. Waiting for the presenter to start a poll.</p>
      </div>
    </section>
  );
}
