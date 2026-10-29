import { AddFriendButton } from "@/components/friends/AddFriendButton";
import { CancelRequestButton } from "@/components/friends/CancelRequestButton";
import { RequestActions } from "@/components/friends/RequestActions";
import type { Person } from "@/lib/data";

export type FriendStatus = "friend" | "incoming" | "outgoing" | "none";

export function FriendResultActions({
  person,
  status,
}: {
  person: Person;
  status: FriendStatus;
}) {
  if (status === "friend") {
    return (
      <span className="rounded-full bg-white/[0.06] px-4 py-2 text-[13px] font-medium text-white/40">
        Friends
      </span>
    );
  }

  if (status === "incoming") {
    return <RequestActions fromId={person.id} />;
  }

  if (status === "outgoing") {
    return <CancelRequestButton personId={person.id} />;
  }

  return <AddFriendButton username={person.username} />;
}
