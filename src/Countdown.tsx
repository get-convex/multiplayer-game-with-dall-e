import { api } from "../convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";

export const Countdown: React.FC<{ start: number; end: number }> = ({
  start,
  end,
}) => {
  const getServerTime = useMutation(api.round.serverNow);
  const [, setNow] = useState(Date.now());
  const [skew, setSkew] = useState(0);
  useEffect(() => {
    getServerTime().then((serverNow) => {
      setSkew(serverNow - Date.now());
    });
    const intervalId = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(intervalId);
  }, []);
  const percent = (100 * (Date.now() + skew - start)) / (end - start);
  if (percent >= 100) return <div className="mt-4 h-6 w-full "></div>;
  return (
    <div className="mt-4 h-6 w-full max-w-lg bg-blue-200 rounded-full">
      <div
        className="h-full bg-blue-600 rounded-full"
        style={{ width: percent.toFixed(2) + "%" }}
      ></div>
    </div>
  );
};
