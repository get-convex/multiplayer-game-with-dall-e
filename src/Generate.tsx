import { ClientGameState } from "../convex/shared";
import { Id } from "../convex/_generated/dataModel";
import { InputName } from "./InputName";
import { JoinGame } from "./JoinGame";
import { CreateImage } from "./Submission";

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
    <>
      <ul>
        {game.players.map((player) => (
          <li key={player.pictureUrl}>
            <img src={player.pictureUrl} />
            {player.name} {player.submitted && "✅"}
          </li>
        ))}
      </ul>
    </>
  ) : (
    <CreateImage onSubmit={addRound} />
  );
}
