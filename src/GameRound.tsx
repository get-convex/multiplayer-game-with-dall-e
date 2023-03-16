import { Id } from "../convex/_generated/dataModel";
import { GuessStage } from "./GuessStage";
import { useSessionQuery } from "./hooks/sessionsClient";
import { LabelStage } from "./LabelStage";
import { Loading } from "./Loading";
import { RevealStage } from "./RevealStage";

const GameRound: React.FC<{ roundId: Id<"rounds"> }> = ({ roundId }) => {
  const round = useSessionQuery("round:getRound", roundId);
  if (!round) return <Loading />;

  switch (round.stage) {
    case "label":
      return <LabelStage round={round} roundId={roundId} />;
    case "guess":
      return <GuessStage round={round} roundId={roundId} />;
    case "reveal":
      return <RevealStage round={round} />;
  }
};
export default GameRound;
