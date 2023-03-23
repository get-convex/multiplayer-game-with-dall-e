import { InputName } from "./InputName";
import { ProfilePicture } from "./ProfilePicture";

export function Submissions({
  submitted,
  title,
}: {
  submitted: { name: string; pictureUrl: string; me: boolean }[];
  title: string;
}) {
  return (
    <fieldset>
      <legend className="text-2xl mb-2">{title}</legend>
      <ul>
        {submitted.map((player) => (
          <li key={player.pictureUrl} className="py-1 flex items-center gap-3">
            {player.me ? "👉" : "✅"}
            <ProfilePicture url={player.pictureUrl} />
            <span className="text-lg">
              {player.me ? <InputName /> : player.name}
            </span>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
