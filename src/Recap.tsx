import { ClientGameState } from "../convex/shared";

export function Recap({ game }: { game: ClientGameState }) {
  return (
    <table>
      <tr>
        <th></th>
        <th>Player</th>
        <th>Score</th>
        <th>Likes</th>
      </tr>
      {game.players
        .slice()
        .sort((a, b) => b.score - a.score)
        .map((player, index) => (
          <tr key={player.pictureUrl}>
            <td>#{index + 1}</td>
            <td>
              <img src={player.pictureUrl} />
              {player.name}
            </td>
            <td>{player.score}</td>
            <td>{player.likes}</td>
          </tr>
        ))}
    </table>
  );
}
