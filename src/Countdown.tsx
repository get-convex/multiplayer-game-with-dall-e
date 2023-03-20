import { useEffect, useState } from "react";
import { useMutation } from "../convex/_generated/react";

export const Countdown: React.FC<{ start: number; end: number }> = ({
  start,
  end,
}) => {
  const getServerTime = useMutation("round:serverNow");
  const [, setNow] = useState(Date.now());
  const [skew, setSkew] = useState(0);
  useEffect(() => {
    getServerTime().then((serverNow) => {
      setSkew(serverNow - Date.now());
    });
    const intervalId = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(intervalId);
  }, []);
  const percent = Math.min(
    100,
    (100 * (Date.now() + skew - start)) / (end - start)
  );
  console.log({
    start,
    end,
    skew,
    sinceStart: Date.now() + skew - start,
    percent,
  });
  return (
    <div className="mt-4 h-6 w-full bg-blue-200 rounded-full">
      <div
        className="h-full bg-blue-600 rounded-full"
        style={{ width: percent.toFixed(2) + "%" }}
      ></div>
    </div>
  );
};
