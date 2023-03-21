export function ProfilePicture({
  url,
  small,
}: {
  url: string;
  small?: boolean;
}) {
  const size = small ? "24" : "48";
  return <img src={url} width={size} height={size} className="rounded" />;
}
