import classNames from "classnames";
import { RevealState } from "../convex/shared";
import { ProfilePicture } from "./ProfilePicture";

export function RevealStage({ round }: { round: RevealState }) {
  const users = new Map(round.users.map((u) => [u.userId, u]));
  return (
    <div className="flex flex-col">
      <img
        src={round.imageUrl}
        alt=""
        className="my-4 w-full max-w-lg overflow-hidden rounded border border-neutral-600"
      />
      <ul className="max-w-lg">
        {round.results.map((option) => {
          const scoreDeltas = new Map(
            option.scoreDeltas.map((d) => [d.userId, d.score])
          );
          const user = users.get(option.authorId);
          return (
            <li
              key={option.authorId}
              className={classNames(
                "flex flex-col items-start gap-1 border-b border-b-neutral-500 py-4",
                "w-full border border-blue-200 bg-blue-200 px-4 py-2 text-neutral-black  disabled:border-neutral-400 disabled:text-neutral-500 ",
                {
                  "bg-green-400": round.authorId === option.authorId,
                }
              )}
            >
              <label className="flex">
                <span className="mr-2 flex text-lg">{option.prompt} </span>
              </label>
              <div className="flex items-center gap-1 pl-2 text-sm">
                by
                <ProfilePicture url={user!.pictureUrl} me={user!.me} small />
                {user!.name}
                {!!scoreDeltas.get(option.authorId) && (
                  <span className="rounded-full bg-orange-400 px-2 text-neutral-black ">
                    +{scoreDeltas.get(option.authorId)}
                  </span>
                )}
                {option.likes.length
                  ? option.likes.map((userId) => (
                      <label key={userId} className="flex">
                        👍
                      </label>
                    ))
                  : null}
              </div>
              {option.votes.length ? (
                <div className="pl-6">
                  <span className="text-sm font-semibold">
                    {option.votes.length} Vote{option.votes.length > 1 && "s"}{" "}
                  </span>
                  <ol>
                    {option.votes.map((userId) => (
                      <li key={userId} className="flex gap-1 py-1">
                        <ProfilePicture
                          url={users.get(userId)!.pictureUrl}
                          me={users.get(userId)!.me}
                          small
                        />
                        {users.get(userId)!.name || "(Anonymous)"}

                        {scoreDeltas.has(userId) ? (
                          <span className="rounded-full bg-purple-400 px-2 text-neutral-black">
                            +{scoreDeltas.get(userId)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
