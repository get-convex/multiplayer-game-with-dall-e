import { useCallback } from "react";
import { ClientGameState } from "../convex/shared";
import { Id } from "../convex/_generated/dataModel";
import GameRound from "./GameRound";
import { Generate } from "./Generate";
import { useSessionMutation, useSessionQuery } from "./hooks/sessionsClient";
import { Lobby } from "./Lobby";
import { Recap } from "./Recap";

const NextButton = (props: {
  gameId: Id<"games">;
  stage: ClientGameState["state"]["stage"];
}) => {
  const progress = useSessionMutation("game:progress");
  return (
    <button onClick={(e) => progress(props.gameId, props.stage)}>Next</button>
  );
};

const Game: React.FC<{
  gameId: Id<"games">;
  done: (nextGameId: Id<"games"> | null) => void;
}> = ({ gameId, done }) => {
  const game = useSessionQuery("game:get", gameId);
  const submit = useSessionMutation("game:submit");
  const playAgain = useSessionMutation("game:playAgain");
  const addRound = useCallback(
    (submissionId: Id<"submissions">) => submit({ submissionId, gameId }),
    [submit, gameId]
  );
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
          <Lobby game={game} />
          {footer}
        </>
      );
    case "generate":
      return <Generate game={game} addRound={addRound} />;
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
          <Recap game={game} />
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
