import { ClientGameState } from "../convex/shared";
import { Health } from "./Submission";

export function Lobby({ game }: { game: ClientGameState }) {
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
    </>
  );
}
