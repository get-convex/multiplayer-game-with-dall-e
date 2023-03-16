import { useSessionMutation, useSessionQuery } from "./hooks/sessionsClient";
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
      onChange={(e) => setName(e.target.value)}
      placeholder="Enter a name"
    />
  ) : (
    <input type="text" />
  );
}
