import { useProfilePageModel } from "./useProfilePageModel";
import { ProfilePageSpecialViews } from "./ProfilePageSpecialViews";
export function ProfilePage() { const model = useProfilePageModel(); return <ProfilePageSpecialViews model={model} />; }
