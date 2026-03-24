export type Member = {
  name: string;
  graduationYear: number;
  url?: string;
  role?: string;
  blurb?: string;
  avatar?: string;
  github?: string;
  linkedin?: string;
  hasWebsite: boolean;
};

export type MembersData = {
  [year: number]: Member[];
};

