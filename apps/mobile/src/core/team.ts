/**
 * Who is on a team, and what each of them is allowed to do.
 *
 * The account is the authority here, not this file. Every rule below is a
 * mirror of one the server already enforces, written down once so a button
 * that would be refused is never offered in the first place. If the two ever
 * disagree, the server wins and the person sees why.
 *
 * Three roles, and they nest: an owner can do everything a manager can, a
 * manager everything a teammate can.
 */

export type TeamRole = 'owner' | 'manager' | 'staff';

/** Most powerful first, the way the team list reads. */
export const TEAM_ROLES: TeamRole[] = ['owner', 'manager', 'staff'];

export const ROLE_LABEL: Record<TeamRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Staff',
};

/** The one line under a role while somebody is picking one. */
export const ROLE_HINT: Record<TeamRole, string> = {
  owner: 'Can do everything, including billing.',
  manager: 'Can add places, areas, speakers and times.',
  staff: 'Can play a sound and see what played.',
};

/**
 * Who can do what, in three sentences.
 *
 * One sheet, read top to bottom, in the order a person meets these people:
 * the ones who press play, the ones who set it up, the one who pays.
 */
export const ROLE_POWERS: Record<TeamRole, string> = {
  staff: 'Staff can start and stop sounds.',
  manager: 'Managers can change plans and schedules.',
  owner: 'Owners manage the team and billing.',
};

export const WHO_CAN_DO_WHAT = 'Who can do what';

/** The things a person can be stopped from doing. */
export type TeamAction =
  /** start and stop a sound in an area */
  | 'play'
  /** write a protection plan and put one on an area */
  | 'plans'
  /** set the times a place runs on its own */
  | 'schedules'
  /** add or rename a place, an area or a speaker */
  | 'places'
  /** invite somebody, take them off, pay for it */
  | 'team';

const RANK: Record<TeamRole, number> = { staff: 1, manager: 2, owner: 3 };

/** The lowest role each thing takes. */
const NEEDED: Record<TeamAction, TeamRole> = {
  play: 'staff',
  plans: 'manager',
  schedules: 'manager',
  places: 'manager',
  team: 'owner',
};

/** True when somebody with this role may do this. Nobody is never allowed. */
export function can(role: TeamRole | null | undefined, action: TeamAction): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[NEEDED[action]];
}

/** The one line to show somebody a thing they cannot do. */
export function whyNot(action: TeamAction): string {
  return `${ROLE_LABEL[NEEDED[action]]}s can do this. Ask one of yours.`;
}
