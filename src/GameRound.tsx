import { useEffect, useState } from "react";
import { Id } from "../convex/_generated/dataModel";
import { useSessionMutation, useSessionQuery } from "./hooks/sessionsClient";

const GameRound: React.FC<{ roundId: Id<"rounds"> }> = ({ roundId }) => {
  const round = useSessionQuery("round:getRound", roundId);
  const [prompt, setPrompt] = useState("");
  const addPrompt = useSessionMutation("round:addOption");
  const submitGuess = useSessionMutation("round:guess");
  const [error, setError] = useState<string>();
  useEffect(() => {
    setPrompt("");
    setError("");
  }, [roundId]);
  if (!round) return <article aria-busy="true"></article>;

  switch (round.stage) {
    case "label":
      return (
        <div>
          <img
            src={round.imageUrl}
            alt=""
            className="w-full max-w-xl border border-neutral-600 rounded overflow-hidden my-4"
          />
          {round.mine ? (
            "This was your image."
          ) : round.submitted.find((submission) => submission.me) ? (
            <section>
              Prompt submitted
              <ul>
                {round.submitted.map((player) => (
                  <li key={player.pictureUrl}>
                    <img src={player.pictureUrl} />
                    {player.name} ✅
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const result = await addPrompt({ roundId, prompt });
                if (!result.success) setError(result.reason);
              }}
              className="flex"
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="bg-transparent border border-neutral-400 p-2 focus:outline-none placeholder:text-neutral-400 text-blue-400 focus:border-blue-400 h-12 basis-0 grow"
              />
              <label className="basis-0">
                {error}
                <input
                  type="submit"
                  value="Submit prompt"
                  aria-invalid={!!error}
                  className="h-12 border border-blue-200 bg-blue-200 py-2 px-4 text-neutral-black hover:bg-blue-400"
                />
              </label>
            </form>
          )}
        </div>
      );
    case "guess":
      return (
        <div>
          <img
            src={round.imageUrl}
            alt=""
            className="w-full max-w-xl border border-neutral-600 rounded overflow-hidden my-4"
          />
          {round.mine ? (
            "This was your image"
          ) : round.submitted.find((submission) => submission.me) ? (
            <section className="flex flex-col">
              <span className="mb-2">Revealing answers...</span>
              <span className="text-xl mb-4">You submitted!</span>
              <ul>
                {round.submitted.map((player) => (
                  <li
                    key={player.pictureUrl}
                    className="flex items-center gap-3"
                  >
                    <img
                      src={player.pictureUrl}
                      width="48"
                      height="48"
                      className="rounded"
                    />
                    <span className="text-lg">{player.name}</span>
                    {/* TODO: Replace emoji with icon. */}
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <fieldset>
              <legend className="text-2xl mb-2">Guess the prompt</legend>
              <ul className="mb-6">
                {round.options.map((option) => (
                  <li key={option} className="mb-2">
                    <label className="flex gap-2 items-center text-lg">
                      {error}
                      <button
                        onClick={async () => {
                          const result = await submitGuess({
                            roundId,
                            prompt: option,
                          });
                          if (!result.success) setError(result.reason);
                        }}
                        disabled={option === round.myPrompt}
                        className="border border-blue-200 text-lg py-2 px-4 disabled:border-neutral-400 disabled:text-neutral-400 disabled:cursor-not-allowed cursor-pointer text-blue-200 hover:text-blue-400 hover:border-blue-400 transition-colors"
                        aria-invalid={option === round.myGuess && !!error}
                      >
                        {option}
                      </button>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
        </div>
      );
    case "reveal":
      const users = round.users;
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
                  by {users.get(option.authorId)!.name}
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
                          {users.get(userId)!.name}

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
                        <li key={userId}>{users.get(userId)!.name}</li>
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
};
export default GameRound;
