import { ClientGameState } from "../convex/shared";
import { Id } from "../convex/_generated/dataModel";
import { useMutation } from "../convex/_generated/react";
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
  nextButton?: React.ReactElement;
}> = ({ game, nextButton, roundId }) => {
  const round = useSessionQuery("round:getRound", roundId);
  const progress = useMutation("round:progress");
  if (!round) return <Loading />;
  const skipButton = game?.hosting && (
    //  !!game.players.find((p) => p.me) ? (
    <NextButton onClick={() => progress(roundId, round.stage)} title="Next" />
  );
  // ) : (
  //   <JoinGame gameCode={game.gameCode} />
  // ));

  switch (round.stage) {
    case "label":
      return (
        <>
          <LabelStage round={round} roundId={roundId} />
          {skipButton}
        </>
      );
    case "guess":
      return (
        <>
          <GuessStage round={round} roundId={roundId} />
          {skipButton}
        </>
      );
    case "reveal":
      return (
        <>
          <RevealStage round={round} />
          {nextButton}
        </>
      );
  }
};
export default GameRound;
