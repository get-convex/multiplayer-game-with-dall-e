export const NextButton = (props: {
  onClick: () => unknown;
  title: string;
  disabled?: boolean;
}) => {
  return (
    <button
      onClick={props.onClick}
      className="mt-8 w-full h-12 border border-blue-200 bg-blue-200 py-2 px-4 text-neutral-black hover:bg-blue-400 disabled:border-neutral-400 disabled:text-neutral-400 disabled:cursor-not-allowed"
      disabled={!!props.disabled}
      title={
        props.disabled
          ? "Only the host can skip"
          : "Skip to the next part of the game without waiting for all players to finish"
      }
    >
      {props.title}
    </button>
  );
};
