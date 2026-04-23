export interface Social {
  type: 'github' | 'linkedin' | 'twitter' | 'instagram' | 'website';
  url: string;
}

export interface Member {
  name: string;
  url: string;
  description: string;
  location: string;
  blurb: string;
  cohort: string;
  avatar?: string;
  hobbies?: string[];
  experiences?: string[];
  socials?: Social[];
}
