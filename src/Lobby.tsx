import { ClientGameState } from "../convex/shared";
import { JoinGame } from "./JoinGame";
import { Health } from "./Submission";

export function Lobby({ game }: { game: ClientGameState }) {
  const profile = useSessionQuery("users:getMyProfile");
  const setName = useSingleFlight(useSessionMutation("users:setName"));
  return (
    <div className="border border-neutral-400 rounded p-4 lg:p-8 flex flex-col items-center gap-4">
      <span className="font-display stretch-min text-6xl mb-4">
        Invite your friends!
      </span>
      <p>Share this code for others to join:</p>
      <div className="font-display stretch-min text-4xl font-extrabold mb-8">
        {game.gameCode}
      </div>
      {!game.playing && <JoinGame gameCode={game.gameCode} />}
      <div className="w-full mb-8">
        <div className="text-2xl mb-4">Players</div>
        <ol>
          {game.players.map((player) => (
            <li
              key={player.pictureUrl}
              className="flex gap-2 items-center mb-2"
            >
              {player.me && "👉"}
              <img
                src={player.pictureUrl}
                width="48"
                height="48"
                className="rounded"
              />
              {player.me && profile ? (
                <input
                  className="bg-neutral-900 focus:outline-none"
                  name="name"
                  defaultValue={profile.name}
                  type="text"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter a name"
                />
              ) : (
                player.name
              )}
            </li>
          ))}
        </ol>
      </div>
      <Health />
    </div>
  );
}
