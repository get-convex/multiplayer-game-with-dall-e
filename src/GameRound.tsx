import { ClientGameState } from "../convex/shared";
import { Id } from "../convex/_generated/dataModel";
import { useMutation } from "../convex/_generated/react";
import { Countdown } from "./Countdown";
import { GuessStage } from "./GuessStage";
import { useSessionMutation, useSessionQuery } from "./hooks/sessionsClient";
import { JoinGame } from "./JoinGame";
import { LabelStage } from "./LabelStage";
import { Loading } from "./Loading";
import { NextButton } from "./NextButton";
import { RevealStage } from "./RevealStage";

const GameRound: React.FC<{
  roundId: Id<"rounds">;
  game?: ClientGameState;
  gameId?: Id<"games">;
  nextButton?: React.ReactElement | false;
}> = ({ nextButton, roundId, game, gameId }) => {
  const round = useSessionQuery("round:getRound", roundId);
  const progress = useMutation("round:progress");
  if (!round) return <Loading />;
  const footer = (
    <>
      {
        game?.hosting && (
          //  !!game.players.find((p) => p.me) ? (
          <NextButton
            onClick={() => progress(roundId, round.stage)}
            title="Next"
          />
        )
        // ) : (
        //   <JoinGame gameCode={game.gameCode} />
        // ));
      }
      <Countdown start={round.stageStart} end={round.stageEnd} />
    </>
  );

  switch (round.stage) {
    case "label":
      return (
        <>
          <LabelStage round={round} roundId={roundId} gameId={gameId} />
          {footer}
        </>
      );
    case "guess":
      return (
        <>
          <GuessStage round={round} roundId={roundId} gameId={gameId} />
          {footer}
        </>
      );
    case "reveal":
      return (
        <>
          <RevealStage round={round} />
          {nextButton}
          <Countdown start={round.stageStart} end={round.stageEnd} />
        </>
      );
  }
};
export default GameRound;
