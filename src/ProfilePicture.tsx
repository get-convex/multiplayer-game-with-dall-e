import { useState } from "react";
import ProfilePicker from "./ProfilePicker";

export function ProfilePicture({
  url,
  me,
  small,
}: {
  url: string;
  me?: boolean;
  small?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const size = small ? "24px" : "48px";
  return (
    <>
      <div className="relative group">
        <img src={url} width={size} height={size} className="rounded" />
        {me && (
          <>
            <ProfilePicker open={pickerOpen} setOpen={setPickerOpen} />
            <button
              onClick={() => setPickerOpen(true)}
              className="hidden group-hover:block absolute inset-0 bg-gray-500 bg-opacity-75 rounded"
            >
              ✍️
            </button>
          </>
        )}
      </div>
    </>
  );
}
