import { ClientGameState } from "../convex/shared";
import { Health } from "./Submission";

export function Lobby({ game }: { game: ClientGameState }) {
  return (
    <div className="border border-neutral-400 rounded p-4 lg:p-8 flex flex-col items-center gap-4">
      <span className="font-display stretch-min text-6xl mb-4">
        Invite players
      </span>
      <p>Share this code with other players to join this room:</p>
      <div className="font-display stretch-min text-4xl font-extrabold mb-8">
        {game.gameCode}
      </div>
      <div className="w-full mb-8">
        <div className="text-2xl mb-4">Players</div>
        <ol>
          {game.players.map((player) => (
            <li
              key={player.pictureUrl}
              className="flex gap-2 items-center mb-2"
            >
              <img
                src={player.pictureUrl}
                width="48"
                height="48"
                className="rounded"
              />
              {player.name}
              {player.me && " (you)"}
            </li>
          ))}
        </ol>
      </div>
      <Health />
    </div>
  );
}
