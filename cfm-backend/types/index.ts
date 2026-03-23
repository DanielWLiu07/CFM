export type Member = {
  name: string;
  url: string;
  graduationYear: number;
};

export type MembersData = {
  [year: number]: Member[];
};

