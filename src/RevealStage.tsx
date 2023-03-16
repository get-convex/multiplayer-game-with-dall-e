export function RevealStage({
  round,
}: {
  round: {
    users: Map<string, { name: string; pictureUrl: string; me: boolean }>;
    stage: "reveal";
    authorId: string;
    stageEnd: number;
    me: string;
    imageUrl: string;
    results: {
      prompt: string;
      authorId: string;
      votes: string[];
      likes: string[];
      scoreDeltas: Map<string, number>;
    }[];
  };
}) {
  return (
    <div className="flex flex-col">
      <span className="my-4">Loading next prompt...</span>
      <span className="text-xl mb-4">Reveal</span>
      <ul className="border-t border-t-neutral-500">
        {round.results.map((option) => (
          <li
            key={option.authorId}
            className="border-b border-b-neutral-500 py-4 flex flex-col items-start gap-2"
          >
            {round.authorId === option.authorId && (
              <span className="bg-green-300 rounded-full px-2 text-neutral-black">
                Actual answer
              </span>
            )}
            <span className="text-xl font-bold">{option.prompt}</span>
            <div className="flex gap-2">
              by {round.users.get(option.authorId)!.name}
              <span className="rounded-full px-2 bg-orange-400 text-neutral-black">
                +{option.scoreDeltas.get(option.authorId)}
              </span>
            </div>
            {option.votes.length ? (
              <div className="pl-6">
                <span className="text-sm font-bold">
                  {option.votes.length} Votes
                </span>
                <ol>
                  {option.votes.map((userId) => (
                    <li key={userId}>
                      {round.users.get(userId)!.name}

                      {option.scoreDeltas.has(userId) ? (
                        <span className="px-2 rounded-full bg-purple-400 text-neutral-black">
                          {option.scoreDeltas.get(userId)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            {option.likes.length ? (
              <label>
                {option.likes.length} Likes
                <ol>
                  {option.votes.map((userId) => (
                    <li key={userId}>{round.users.get(userId)!.name}</li>
                  ))}
                </ol>
              </label>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
