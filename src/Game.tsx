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
    <button
      onClick={(e) => progress(props.gameId, props.stage)}
      className="h-12 border border-blue-200 bg-blue-200 py-2 px-4 text-neutral-black hover:bg-blue-400"
    >
      Next
    </button>
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
        <section className="mt-4">
          <p className="mb-4">You are the host of this game.</p>
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
        <div className="flex flex-col gap-2">
          <Recap game={game} />
          <p>Done!</p>
          <button
            type="submit"
            onClick={(e) => done(null)}
            className="h-12 border border-blue-200 bg-blue-200 py-2 px-4 text-neutral-black hover:bg-blue-400"
          >
            Home
          </button>
          <button
            type="submit"
            onClick={async (e) => {
              const nextGameId = await playAgain(gameId);
              done(nextGameId);
            }}
            className="h-12 border border-blue-200 bg-blue-200 py-2 px-4 text-neutral-black hover:bg-blue-400"
          >
            Play again
          </button>
        </div>
      );
  }
};
export default Game;
