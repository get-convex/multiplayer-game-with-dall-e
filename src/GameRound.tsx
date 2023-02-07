import { useState } from "react";
import { Id } from "../convex/_generated/dataModel";
import { useQuery } from "../convex/_generated/react";
import { useSessionMutation, useSessionQuery } from "./hooks/sessionsClient";

const GameRound: React.FC<{ roundId: Id<"rounds"> }> = ({ roundId }) => {
  const round = useSessionQuery("round:getRound", roundId);
  const [prompt, setPrompt] = useState("");
  const addPrompt = useSessionMutation("round:addOption");
  const [guess, setGuess] = useState("");
  const submitGuess = useSessionMutation("round:guess");
  const [error, setError] = useState<string>();
  if (!round) return <article aria-busy="true"></article>;

  switch (round.stage) {
    case "label":
      return (
        <div>
          <img src={round.imageUrl} />
          {round.mine ? (
            "This was your image"
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
          <img src={round.imageUrl} />
          {round.mine ? (
            "This was your image"
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const result = await submitGuess({ roundId, prompt: guess });
                if (!result.success) setError(result.reason);
              }}
            >
              <fieldset>
                <legend>Guess the prompt!</legend>
                {round.options.map((option) => (
                  <label key={option}>
                    <input
                      type="radio"
                      disabled={option === prompt}
                      checked={option === guess}
                      onChange={() => setGuess(option)}
                    />
                    {option}
                  </label>
                ))}
              </fieldset>
              <label>
                {error}
                <input
                  type="submit"
                  value="Submit guess"
                  disabled={!guess}
                  aria-invalid={!!error}
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
