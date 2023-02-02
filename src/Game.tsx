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

const Submission = (props: { submissionId: Id<"submissions"> }) => {
  const submission = useSessionQuery("submissions:get", props.submissionId);
  console.log(submission);
  return submission ? (
    <figure>
      <img src={submission.url} />
    </figure>
  ) : (
    <article aria-busy="true"></article>
  );
};

const Game: React.FC<{
  gameId: Id<"games">;
  done: (nextGameId: Id<"games"> | null) => void;
}> = ({ gameId, done }) => {
  const game = useSessionQuery("game:get", gameId);
  const name = useSessionQuery("users:getName");
  const setName = useSingleFlight(useSessionMutation("users:setName"));
  const [prompt, setPrompt] = useState("");
  const startSubmission = useSessionMutation("submissions:start");
  const [submissionId, setSubmissionId] = useState<Id<"submissions">>();
  const addRound = useSessionMutation("submissions:addToGame");
  const playAgain = useSessionMutation("game:playAgain");
  if (!game) return <article aria-busy="true"></article>;
  if (game.nextGameId) done(game.nextGameId);
  const footer = (
    <>
      {game.hosting && (
        <section>
          <p>You are the host of this game.</p>
          <NextButton gameId={gameId} stage={game.state.stage} />
        </section>
      )}
    </>
  );
  switch (game.state.stage) {
    case "lobby":
      return (
        <>
          Invite friends to join: {game.gameCode}
          {name && (
            <input
              name="name"
              defaultValue={name}
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
        <>
          Generate an image:
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmissionId(await startSubmission({ gameId, prompt }));
            }}
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <input type="submit" value="Submit prompt" />
          </form>
          {submissionId && (
            <>
              <Submission submissionId={submissionId} />
              <button
                type="submit"
                onClick={(e) => addRound({ submissionId, gameId })}
              >
                Submit
              </button>
            </>
          )}
        </>
      );
    case "rounds":
      return (
        <>
          <GameRound roundId={game.state.roundId} />
          {footer}
        </>
      );
    case "recap":
      return (
        <>
          <ul>
            {game.players.map((player) => (
              <li key={player.pictureUrl}>
                <img src={player.pictureUrl} />
                {player.name} Score: {player.score} Likes: {player.likes}
              </li>
            ))}
          </ul>
          Done!
          <button type="submit" onClick={(e) => done(null)}>
            Home
          </button>
          <button
            type="submit"
            onClick={async (e) => {
              const nextGameId = await playAgain(gameId);
              done(nextGameId);
            }}
          >
            Play again
          </button>
        </>
      );
  }
};
export default Game;
