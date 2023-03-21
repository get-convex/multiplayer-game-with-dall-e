import classNames from "classnames";
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
  const [showEdit, setShowEdit] = useState(false);
  console.log({ pickerOpen, showEdit });
  const size = small ? "24px" : "48px";
  return (
    <>
      <div
        className="relative"
        onMouseEnter={() => setShowEdit(true)}
        onMouseLeave={() => setShowEdit(false)}
      >
        <img src={url} width={size} height={size} className="rounded" />
        {me && (
          <>
            <ProfilePicker open={pickerOpen} setOpen={setPickerOpen} />
            <button
              onClick={() => setPickerOpen(true)}
              className={classNames(
                "absolute inset-0 bg-gray-500 bg-opacity-75 rounded",
                { invisible: !showEdit }
              )}
            >
              ✍️
            </button>
          </>
        )}
      </div>
    </>
  );
}
