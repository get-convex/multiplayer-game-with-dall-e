import { api } from "../convex/_generated/api";
import { useCallback } from "react";
import { Id } from "../convex/_generated/dataModel";
import GameRound from "./GameRound";
import { Generate } from "./Generate";
import { useSessionMutation, useSessionQuery } from "./hooks/useServerSession";
import { Lobby } from "./Lobby";
import { NextButton } from "./NextButton";
import { Recap } from "./Recap";

const Game: React.FC<{
  gameId: Id<"games">;
  done: (nextGameId: Id<"games"> | null) => void;
}> = ({ gameId, done }) => {
  const game = useSessionQuery(api.game.get, { gameId });
  const submit = useSessionMutation(api.game.submit);
  const playAgain = useSessionMutation(api.game.playAgain);
  const addRound = useCallback(
    (submissionId: Id<"submissions">) => submit({ submissionId, gameId }),
    [submit, gameId]
  );
  const progress = useSessionMutation(api.game.progress);
  if (!game) return <article aria-busy="true"></article>;
  if (game.nextGameId) done(game.nextGameId);
  const next = game.hosting && (
    <NextButton
      onClick={() => progress({ gameId, fromStage: game.state.stage })}
      title={
        game.state.stage === "lobby"
          ? "Start"
          : game.state.stage === "rounds"
          ? "Next"
          : "Skip"
      }
      disabled={!game.hosting || game.players.length <= 2}
    />
  );
  const footer = (
    <section className="mt-4">
      <p className="mb-4">
        {game.players.length > 2 || (
          <span className="mb-4">You need at least 3 players to start.</span>
        )}
        {next}
        <span className="ml-4">
          {game.state.stage === "lobby" &&
            (game.hosting
              ? "You are the host of this game."
              : "Only the host can start the game.")}
        </span>
      </p>
    </section>
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
      return (
        <>
          <Generate game={game} addRound={addRound} />
          {footer}
        </>
      );
    case "rounds":
      return (
        <>
          <GameRound
            roundId={game.state.roundId}
            game={game}
            gameId={gameId}
            nextButton={next}
          />
        </>
      );
    case "recap":
      return (
        <div className="flex flex-col gap-2">
          <Recap game={game} />
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
              const nextGameId = await playAgain({ oldGameId: gameId });
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
