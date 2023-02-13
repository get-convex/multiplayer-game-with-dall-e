import { useSessionMutation, useSessionQuery } from "../hooks/sessionsClient";
import useSingleFlight from "../hooks/useSingleFlight";
import styles from "./Username.module.scss";

const Username = () => {
  const name = useSessionQuery("users:getName");
  const setName = useSingleFlight(useSessionMutation("users:setName"));

  if (typeof name !== "string") {
    return null;
  }

  return (
    <div className={styles.root}>
      <img src="/convex.svg" width="48" height="48" />
      <input
        className={styles.input}
        name="name"
        defaultValue={name}
        type="text"
        onChange={e => setName(e.target.value)}
        placeholder="Type Name"
      />
    </div>
  );
};

export default Username;
