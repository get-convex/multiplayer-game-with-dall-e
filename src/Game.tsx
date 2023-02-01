import { ClientGameState } from "../convex/shared";
import { Id } from "../convex/_generated/dataModel";
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

const Game: React.FC<{ gameCode: string }> = ({ gameCode }) => {
  const game = useSessionQuery("game:get", gameCode);
  if (!game) return <article aria-busy="true"></article>;
  const next = <NextButton gameId={game.gameId} stage={game.state.stage} />;
  const footer = (
    <>
      {game.hosting && <p>You are the host of this round</p>}
      {next}
    </>
  );
  switch (game.state.stage) {
    case "lobby":
      return (
        <>
          Join!
          {gameCode}
          <ol>
            {game.players.map((player) => (
              <li key={player.pictureUrl}>
                <img src={player.pictureUrl} />
                {player.name}
              </li>
            ))}
          </ol>
          {next}
        </>
      );
    case "generate":
      return <>"create!"</>;
    case "rounds":
      return <GameRound roundId={game.state.roundId} />;
    case "recap":
      return <></>;
  }
};
export default Game;
