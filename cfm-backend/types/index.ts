export interface Social {
  type: 'github' | 'linkedin' | 'twitter' | 'instagram' | 'website';
  url: string;
}

export interface Member {
  name: string;
  url: string;
  description: string;
  role: string;
  location: string;
  school: string;
  blurb: string;
  year: string;
  cohort?: string;
  avatar?: string;
  websiteImage?: string;
  hobbies?: string[];
  experiences?: (string | { title: string; logo?: string })[];
  socials?: Social[];
}
