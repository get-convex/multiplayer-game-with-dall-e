import { ClientGameState } from "../convex/shared";

export function Recap({ game }: { game: ClientGameState }) {
  return (
    <ul>
      {game.players.map((player) => (
        <li key={player.pictureUrl}>
          <img src={player.pictureUrl} />
          {player.name} Score: {player.score} Likes: {player.likes}
        </li>
      ))}
    </ul>
  );
}
