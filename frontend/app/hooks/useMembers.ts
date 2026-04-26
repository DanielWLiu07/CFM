import type { ClassMember } from '../components/class/types';
import members from '../../../backend/data/members.json';

/**
 * Members are bundled at build time from the backend's single-source-of-truth file
 * (`backend/data/members.json`). PRs edit one file, the deploy ships it.
 */
export function useMembers() {
  return { members: members as ClassMember[] };
}
