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
            <section>
              You submitted!
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
        <>
          Reveal!
          <ul>
            {round.results.map((option) => (
              <li key={option.authorId}>
                {/*<img src={users.get(option.authorId)!.pictureUrl} />*/}
                <span>
                  {option.prompt}:{" "}
                  {round.authorId === option.authorId && "👈 Actual: "}
                  {users.get(option.authorId)!.name +
                    ": +" +
                    option.scoreDeltas.get(option.authorId)}
                </span>
                {option.votes.length ? (
                  <label>
                    Votes:
                    <ol>
                      {option.votes.map((userId) => (
                        <li key={userId}>
                          {users.get(userId)!.name}
                          {option.scoreDeltas.has(userId)
                            ? ": +" + option.scoreDeltas.get(userId)
                            : null}
                        </li>
                      ))}
                    </ol>
                  </label>
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
        </>
      );
  }
};
export default GameRound;
