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
      return (
        <>
          Reveal!
          <ul>
            {round.results.map((player) => (
              <li key={player.pictureUrl}>
                <section>
                  <img src={player.pictureUrl} />
                  {player.name}
                  {player.actual && "👈"}
                  <p>Prompt: {player.prompt}</p>
                  <p>Scores: {JSON.stringify(player.scoreDeltas)}</p>
                  <p>Likes: {player.likes.length}</p>
                </section>
              </li>
            ))}
          </ul>
        </>
      );
  }
};
export default GameRound;
