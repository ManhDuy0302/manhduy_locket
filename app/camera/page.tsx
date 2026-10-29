import { CameraScreen } from "@/components/camera/CameraScreen";
import { requireUser } from "@/lib/auth";
import { getFriendCount, getLatestMomentFile } from "@/lib/data";
import { getLocketAccount } from "@/lib/locket/store";

export default async function CameraPage() {
  const user = await requireUser();
    const friendCount = await getFriendCount(user.id);
    const latestFile = await getLatestMomentFile(user.id);
    const locketLinked = Boolean(await getLocketAccount(user.id));

  return (
    <div className="mx-auto w-full max-w-[460px] md:border-x md:border-white/[0.04]">
      <CameraScreen
        user={{
          displayName: user.displayName,
          username: user.username,
          avatarFile: user.avatarFile,
        }}
        friendCount={friendCount}
        latestFile={latestFile}
        locketLinked={locketLinked}
      />
    </div>
  );
}
