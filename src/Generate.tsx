import { ClientGameState } from "../convex/shared";
import { Id } from "../convex/_generated/dataModel";
import { CreateImage } from "./Submission";

export function Generate({
  game,
  addRound,
}: {
  game: ClientGameState;
  addRound: (submissionId: Id<"submissions">) => any;
}) {
  return game.players.find((player) => player.me && player.submitted) ? (
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
