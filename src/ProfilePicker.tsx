import { Fragment, useState } from "react";

import { Dialog, Transition } from "@headlessui/react";
import { useSessionMutation, useSessionQuery } from "./hooks/useServerSession";
import { CreateImage } from "./CreateImage";
import { ProfilePicture } from "./ProfilePicture";
import { api } from "../convex/_generated/api";

export default function ProfilePicker({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const profile = useSessionQuery(api.users.getMyProfile);
  const setPicture = useSessionMutation(api.users.setPicture);

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={setOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto text-neutral-black">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
                <div className="flex justify-around">
                  {/* important to set me to false so there isn't infinite recursion! */}
                  {profile && <ProfilePicture url={profile?.pictureUrl} />}
                </div>
                <CreateImage
                  title="Profile Picture"
                  onSubmit={async (submissionId) => {
                    await setPicture({ submissionId });
                    setOpen(false);
                  }}
                />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
