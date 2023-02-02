import { useState } from "react";
import { ClientGameState } from "../convex/shared";
import { Id } from "../convex/_generated/dataModel";
import GameRound from "./GameRound";
import { useSessionMutation, useSessionQuery } from "./hooks/sessionsClient";
import useSingleFlight from "./hooks/useSingleFlight";

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
  const name = useSessionQuery("users:getName");
  const setName = useSingleFlight(useSessionMutation("users:setName"));
  const [prompt, setPrompt] = useState("");
  const submit = useSessionMutation("game:submit");
  if (!game) return <article aria-busy="true"></article>;
  const footer = (
    <>
      {game.hosting && (
        <section>
          <p>You are the host of this game.</p>
          <NextButton gameId={game.gameId} stage={game.state.stage} />
        </section>
      )}
    </>
  );
  switch (game.state.stage) {
    case "lobby":
      return (
        <>
          Join: {gameCode}
          {name && (
            <input
              name="name"
              value={name}
              type="text"
              onChange={(e) => setName(e.target.value)}
              placeholder="Type Name"
            />
          )}
          <ol>
            {game.players.map((player) =>
              player.me ? null : (
                <li key={player.pictureUrl}>
                  <img src={player.pictureUrl} />
                  {player.name}
                </li>
              )
            )}
          </ol>
          {footer}
        </>
      );
    case "generate":
      return (
        <>
          Describe an image:
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit({ gameId: game.gameId, prompt });
            }}
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <input type="submit">Submit prompt</input>
          </form>
        </>
      );
    case "rounds":
      return <GameRound roundId={game.state.roundId} />;
    case "recap":
      return <></>;
  }
};
export default Game;
