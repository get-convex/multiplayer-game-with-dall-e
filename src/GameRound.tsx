import { useState } from "react";
import { Id } from "../convex/_generated/dataModel";
import { useQuery } from "../convex/_generated/react";
import { useSessionMutation, useSessionQuery } from "./hooks/sessionsClient";

const GameRound: React.FC<{ roundId: Id<"rounds"> }> = ({ roundId }) => {
  const round = useSessionQuery("round:getRound", roundId);
  const [prompt, setPrompt] = useState("");
  const addPrompt = useSessionMutation("round:addOption");
  const [guess, setGuess] = useState("");
  const submitGuess = useSessionMutation("round:vote");
  if (!round) return <article aria-busy="true"></article>;

  switch (round.stage) {
    case "label":
      return (
        <div>
          <img src={round.imageUrl} />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await addPrompt({ roundId, prompt });
              if (!result.success) console.error({ result });
            }}
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <input type="submit" value="Submit prompt" />
          </form>
        </div>
      );
    case "guess":
      return (
        <div>
          <img src={round.imageUrl} />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await submitGuess({ roundId, prompt: guess });
              if (!result.success) console.error({ result });
            }}
          >
            <label>Guess the prompt!</label>
            <select
              id="select"
              name="select"
              required
              onChange={(e) => setGuess(e.target.value)}
            >
              {round.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ul></ul>
            <input type="submit" value="Submit guess" />
          </form>
        </div>
      );
    case "reveal":
      return <>Reveal!</>;
  }
};
export default GameRound;
