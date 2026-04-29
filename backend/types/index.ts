export interface Social {
  type: 'github' | 'linkedin' | 'twitter' | 'instagram' | 'website';
  url: string;
}

export interface Member {
  name: string;
  url: string;
  description: string;
  header?: string;
  location: string;
  cohort: string;
  avatar?: string;
  websiteImage?: string;
  role?: string;
  interests?: string[];
  experiences?: string[];
  socials?: Social[];
}
