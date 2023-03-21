import { ClientGameState } from "../convex/shared";
import { ProfilePicture } from "./ProfilePicture";

export function Recap({ game }: { game: ClientGameState }) {
  return (
    <div className="px-4">
      <h1 className="text-2xl font-semibold ">Scores</h1>
      <div className="mt-8 flow-root">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                    <span className="sr-only">Place</span>
                  </th>
                  <th
                    scope="col"
                    className="py-3.5 px-3 text-left text-sm font-semibold text-white"
                  >
                    Player
                  </th>
                  <th
                    scope="col"
                    className="py-3.5 px-3 text-left text-sm font-semibold text-white"
                  >
                    Score
                  </th>
                  <th
                    scope="col"
                    className="py-3.5 px-3 text-left text-sm font-semibold text-white"
                  >
                    Likes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {game.players
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <tr key={player.pictureUrl}>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-sm font-medium sm:pr-0">
                        #{index + 1}
                        <span className="sr-only">, {player.name}</span>
                      </td>
                      <td className="flex items-center whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">
                        <ProfilePicture
                          url={player.pictureUrl}
                          me={player.me}
                        />
                        <span className="pl-2">{player.name}</span>
                      </td>
                      <td className="whitespace-nowrap py-4 px-3 text-sm text-gray-300">
                        {player.score}
                      </td>
                      <td className="whitespace-nowrap py-4 px-3 text-sm text-gray-300">
                        {player.likes}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
