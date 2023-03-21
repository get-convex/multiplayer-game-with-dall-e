import { ClientGameState } from "../convex/shared";
import { Id } from "../convex/_generated/dataModel";
import { InputName } from "./InputName";
import { JoinGame } from "./JoinGame";
import { CreateImage } from "./CreateImage";
import { ProfilePicture } from "./ProfilePicture";

export function Generate({
  game,
  addRound,
}: {
  game: ClientGameState;
  addRound: (submissionId: Id<"submissions">) => any;
}) {
  return !game.playing ? (
    <section>
      <div className="text-5xl font-display stretch-min font-bold">
        Create an image
      </div>
      <p>
        The game has started. Other players are entering their prompts to
        generate images. Want to join?
      </p>
      <JoinGame gameCode={game.gameCode} />
    </section>
  ) : game.players.find((player) => player.me && player.submitted) ? (
    <section>
      <div className="text-5xl font-display stretch-min font-bold">
        Waiting for everyone to make an image...
      </div>
      <div className="text-2xl my-4">Players</div>
      <ul>
        {game.players.map((player) => (
          <li key={player.pictureUrl} className="flex gap-2 items-center mb-2">
            {player.me ? "👉" : player.submitted && "✅"}
            <ProfilePicture url={player.pictureUrl} me={player.me} />
            {player.me ? <InputName /> : player.name}
          </li>
        ))}
      </ul>
    </section>
  ) : (
    <CreateImage onSubmit={addRound} />
  );
}
