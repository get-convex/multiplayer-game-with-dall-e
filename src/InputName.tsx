import { useSessionMutation, useSessionQuery } from "./hooks/useServerSession";
import useSingleFlight from "./hooks/useSingleFlight";

export function InputName() {
  const profile = useSessionQuery("users:getMyProfile");
  const setName = useSingleFlight(useSessionMutation("users:setName"));
  return profile ? (
    <input
      className="bg-neutral-900 focus:outline-none"
      name="name"
      defaultValue={profile.name}
      type="text"
      onChange={(e) => setName({ name: e.target.value })}
      placeholder="Enter a name"
    />
  ) : (
    <input type="text" />
  );
}
