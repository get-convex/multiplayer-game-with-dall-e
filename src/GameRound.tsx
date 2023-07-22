import { api } from "../convex/_generated/api";
import { useMutation } from "convex/react";
import { ClientGameState } from "../convex/shared";
import { Id } from "../convex/_generated/dataModel";
import { Countdown } from "./Countdown";
import { GuessStage } from "./GuessStage";
import { useSessionQuery } from "./hooks/useServerSession";
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
  const round = useSessionQuery(api.round.getRound, { roundId });
  const progress = useMutation(api.round.progress);
  if (!round) return <Loading />;
  const footer = (
    <>
      <Countdown start={round.stageStart} end={round.stageEnd} />
      {
        game?.hosting && (
          //  !!game.players.find((p) => p.me) ? (
          (<NextButton
            onClick={() => progress({ roundId, fromStage: round.stage })}
            title="Next"
          />)
        )
        // ) : (
        //   <JoinGame gameCode={game.gameCode} />
        // ));
      }
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
          <Countdown start={round.stageStart} end={round.stageEnd} />
          {nextButton}
        </>
      );
  }
};
export default GameRound;
