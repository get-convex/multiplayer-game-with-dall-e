import { useEffect, useState } from "react";
import { Id } from "../convex/_generated/dataModel";
import { useSessionMutation, useSessionQuery } from "./hooks/sessionsClient";

const GameRound: React.FC<{ roundId: Id<"rounds"> }> = ({ roundId }) => {
  const round = useSessionQuery("round:getRound", roundId);
  const [prompt, setPrompt] = useState("");
  const addPrompt = useSessionMutation("round:addOption");
  const [guess, setGuess] = useState("");
  const submitGuess = useSessionMutation("round:guess");
  const [error, setError] = useState<string>();
  useEffect(() => {
    setPrompt("");
    setGuess("");
    setError("");
  }, [roundId]);
  if (!round) return <article aria-busy="true"></article>;

  switch (round.stage) {
    case "label":
      return (
        <div>
          <img src={round.imageUrl} alt="" />
          {round.mine ? (
            "This was your image"
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
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <label>
                {error}
                <input
                  type="submit"
                  value="Submit prompt"
                  aria-invalid={!!error}
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
                    <span className="text-2xl">✅</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const result = await submitGuess({ roundId, prompt: guess });
                if (!result.success) setError(result.reason);
              }}
            >
              <fieldset>
                <legend className="text-2xl mb-2">Guess the prompt</legend>
                <ul className="mb-6">
                  {round.options.map((option) => (
                    <li key={option} className="mb-2">
                      <label className="flex gap-2 items-center text-lg">
                        <input
                          type="radio"
                          disabled={option === prompt}
                          checked={option === guess}
                          onChange={() => setGuess(option)}
                          className="w-5 h-5"
                        />
                        {option}
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
              <label>
                {error}
                <input
                  type="submit"
                  value="Submit guess"
                  disabled={!guess}
                  aria-invalid={!!error}
                  className="border border-blue-200 text-lg py-2 px-4 disabled:border-neutral-400 disabled:text-neutral-400 disabled:cursor-not-allowed cursor-pointer text-blue-200 hover:text-blue-400 hover:border-blue-400 transition-colors"
                />
              </label>
            </form>
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
