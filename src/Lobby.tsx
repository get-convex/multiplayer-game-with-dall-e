import { ClientGameState, MaxPlayers } from "../convex/shared";
import { InputName } from "./InputName";
import { JoinGame } from "./JoinGame";
import { Health } from "./CreateImage";
import { ProfilePicture } from "./ProfilePicture";

export function Lobby({ game }: { game: ClientGameState }) {
  return (
    <div className="border border-neutral-400 rounded p-4 lg:p-8 flex flex-col items-center gap-4">
      <span className="font-display stretch-min text-6xl mb-4">
        Invite your friends!
      </span>
      <p>Share this code for others to join:</p>
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
              {player.me && "👉"}
              <ProfilePicture url={player.pictureUrl} me={player.me} />
              {player.me ? <InputName /> : player.name}
            </li>
          ))}
          {!game.playing && game.players.length < MaxPlayers && (
            <JoinGame gameCode={game.gameCode} />
          )}
        </ol>
      </div>
      <Health />
    </div>
  );
}
