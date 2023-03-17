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
      <img
        src={round.imageUrl}
        alt=""
        className="w-full max-w-xl border border-neutral-600 rounded overflow-hidden my-4"
      />
      <ul className="">
        {round.results.map((option) => (
          <li
            key={option.authorId}
            className="border-b border-b-neutral-500 py-4 flex flex-col items-start gap-2"
          >
            <span className="text-xl font-bold">
              {option.prompt}{" "}
              {round.authorId === option.authorId && (
                <span className="font-normal bg-green-300 rounded-full px-2 text-neutral-black">
                  Actual answer
                </span>
              )}
            </span>
            <div className="flex gap-2">
              by
              <img
                src={round.users.get(option.authorId)!.pictureUrl}
                width="24"
                height="24"
                className="rounded"
              />
              {round.users.get(option.authorId)!.name}
              {!!option.scoreDeltas.get(option.authorId) && (
                <span className="rounded-full px-2 bg-orange-400 text-neutral-black">
                  +{option.scoreDeltas.get(option.authorId)}
                </span>
              )}
            </div>
            {option.votes.length ? (
              <div className="pl-6">
                <span className="text-sm font-bold">
                  {option.votes.length} Vote{option.votes.length > 1 && "s"}{" "}
                </span>
                <ol>
                  {option.votes.map((userId) => (
                    <li key={userId} className="flex">
                      <img
                        src={round.users.get(userId)!.pictureUrl}
                        width="24"
                        height="24"
                        className="rounded mr-1"
                      />
                      {round.users.get(userId)!.name || "(Anonymous)"}

                      {option.scoreDeltas.has(userId) ? (
                        <span className="mx-1 px-2 rounded-full bg-purple-400 text-neutral-black">
                          +{option.scoreDeltas.get(userId)}
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
