import { InputName } from "./InputName";

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
            {player.me && !player.name ? "👉" : "✅"}
            <img
              src={player.pictureUrl}
              width="48"
              height="48"
              className="rounded"
            />
            <span className="text-lg">
              {player.me ? <InputName /> : player.name}
            </span>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
