type LeaderboardProps = {
  participants: Array<{ nickname: string; score: number }>;
};

export function Leaderboard({ participants }: LeaderboardProps) {
  if (participants.length === 0) {
    return <p className="muted">No leaderboard yet.</p>;
  }

  return (
    <div className="list compact-list">
      {participants.map((participant, index) => (
        <div className="plain-row" key={`${participant.nickname}-${index}`}>
          <span>{participant.nickname}</span>
          <strong>{participant.score}</strong>
        </div>
      ))}
    </div>
  );
}
