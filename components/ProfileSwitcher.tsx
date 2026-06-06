import Link from "next/link";
import { PROFILE_OPTIONS, type WeightProfile } from "@/lib/recommendation-rigor";

type ProfileSwitcherProps = {
  activeProfile: WeightProfile;
  caseId: string;
  currentPath: string;
};

export function ProfileSwitcher({ activeProfile, caseId, currentPath }: ProfileSwitcherProps) {
  return (
    <section className="profile-switcher" aria-label="目标权重切换">
      <div className="section-heading compact">
        <p className="eyebrow">目标权重</p>
        <h2>按 GTM 目标切换判断口径</h2>
      </div>
      <div className="profile-options">
        {PROFILE_OPTIONS.map((profile) => {
          const isActive = profile.id === activeProfile;
          const profileQuery = profile.id === "default" ? "" : `&profile=${profile.id}`;
          return (
            <Link
              key={profile.id}
              className={isActive ? "profile-option active" : "profile-option"}
              href={`${currentPath}?case=${caseId}${profileQuery}`}
            >
              <span>{profile.label}</span>
              <small>{profile.description}</small>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
