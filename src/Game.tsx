import { useState } from "react";
import { ClientGameState, MaxPromptLength } from "../convex/shared";
import { Id } from "../convex/_generated/dataModel";
import { useQuery } from "../convex/_generated/react";
import GameRound from "./GameRound";
import { useSessionMutation, useSessionQuery } from "./hooks/sessionsClient";

const NextButton = (props: {
  gameId: Id<"games">;
  stage: ClientGameState["state"]["stage"];
}) => {
  const progress = useSessionMutation("game:progress");
  return (
    <button onClick={(e) => progress(props.gameId, props.stage)}>Next</button>
  );
};

const Health = () => {
  const health = useQuery("submissions:health") ?? null;
  return (
    health && (
      <section>
        <strong>
          Dall-E status {health[1] > 0.8 ? "✅" : health[1] > 0.5 ? "⚠️" : "❌"}
        </strong>
        <span>
          Image generation time: {(health[0] / 1000).toFixed(1)} seconds
        </span>
      </section>
    )
  );
};

const Submission = (props: { submissionId: Id<"submissions"> }) => {
  const result = useSessionQuery("submissions:get", props.submissionId);
  switch (result?.status) {
    case "generating":
      return (
        <figure>
          <article aria-busy="true"></article>
          {result.details}
        </figure>
      );
    case "failed":
      return <p>❗️{result.reason}</p>;
    case "saved":
      return (
        <figure>
          <img src={result.url} />
          Generated in {result.elapsedMs / 1000} seconds.
        </figure>
      );
  }
  return null;
};

const Game: React.FC<{
  gameId: Id<"games">;
  done: (nextGameId: Id<"games"> | null) => void;
}> = ({ gameId, done }) => {
  const game = useSessionQuery("game:get", gameId);
  const [prompt, setPrompt] = useState("");
  const startSubmission = useSessionMutation("submissions:start");
  const [submissionId, setSubmissionId] = useState<Id<"submissions">>();
  const addRound = useSessionMutation("game:submit");
  const playAgain = useSessionMutation("game:playAgain");
  if (!game) return <article aria-busy="true"></article>;
  if (game.nextGameId) done(game.nextGameId);
  const footer = (
    <>
      {game.hosting && (
        <section>
          <p>You are the host of this game.</p>
          <NextButton gameId={gameId} stage={game.state.stage} />
        </section>
      )}
    </>
  );
  switch (game.state.stage) {
    case "lobby":
      return (
        <>
          Invite friends to join: {game.gameCode}
          <Health />
          <ol>
            {game.players.map((player) => (
              <li key={player.pictureUrl}>
                <img src={player.pictureUrl} />
                {player.name}
                {player.me && "👈"}
              </li>
            ))}
          </ol>
          {footer}
        </>
      );
    case "generate":
      return game.players.find((player) => player.me && player.submitted) ? (
        <>
          <ul>
            {game.players.map((player) => (
              <li key={player.pictureUrl}>
                <img src={player.pictureUrl} />
                {player.name} {player.submitted && "✅"}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <Health />
          Describe an image:
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmissionId(await startSubmission(prompt));
            }}
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) =>
                setPrompt(e.target.value.substring(0, MaxPromptLength))
              }
            />
            <input type="submit" value="Preview" />
          </form>
          {submissionId && (
            <>
              <Submission submissionId={submissionId} />
              <button
                type="submit"
                onClick={(e) => addRound({ submissionId, gameId })}
              >
                Submit
              </button>
            </>
          )}
        </>
      );
    case "rounds":
      return (
        <>
          <GameRound roundId={game.state.roundId} />
          {footer}
        </>
      );
    case "recap":
      return (
        <>
          <ul>
            {game.players.map((player) => (
              <li key={player.pictureUrl}>
                <img src={player.pictureUrl} />
                {player.name} Score: {player.score} Likes: {player.likes}
              </li>
            ))}
          </ul>
          Done!
          <button type="submit" onClick={(e) => done(null)}>
            Home
          </button>
          <button
            type="submit"
            onClick={async (e) => {
              const nextGameId = await playAgain(gameId);
              done(nextGameId);
            }}
          >
            Play again
          </button>
        </>
      );
  }
};
export default Game;
