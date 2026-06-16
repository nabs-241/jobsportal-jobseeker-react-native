export interface NavigationItem {
  key: string;
  label: string;
  icon: string;
  requiresAuth?: boolean;
  userType?: 'seeker';
}

export interface NavigationConfig {
  [key: string]: NavigationItem;
}

// Centralized navigation configuration for jobseeker
export const jobseekerNavigation: NavigationConfig = {
  'edit-profile': {
    key: 'edit-profile',
    label: 'Edit Profile',
    icon: 'person',
    requiresAuth: true,
    userType: 'seeker'
  },
  'build-resume': {
    key: 'build-resume',
    label: 'Build Resume',
    icon: 'description',
    requiresAuth: true,
    userType: 'seeker'
  },
  'my-applications': {
    key: 'my-applications',
    label: 'My Applications',
    icon: 'work',
    requiresAuth: true,
    userType: 'seeker'
  },
  'favourite-jobs': {
    key: 'favourite-jobs',
    label: 'Favourite Jobs',
    icon: 'favorite',
    requiresAuth: true,
    userType: 'seeker'
  },
  'job-search': {
    key: 'job-search',
    label: 'Job Search',
    icon: 'search',
    requiresAuth: false,
    userType: 'seeker'
  },
  'job-alerts': {
    key: 'job-alerts',
    label: 'Job Alerts',
    icon: 'notifications-active',
    requiresAuth: true,
    userType: 'seeker'
  },
  'my-followings': {
    key: 'my-followings',
    label: 'My Followings',
    icon: 'business',
    requiresAuth: true,
    userType: 'seeker'
  },
  'profile': {
    key: 'profile',
    label: 'Profile',
    icon: 'account-circle',
    requiresAuth: true,
    userType: 'seeker'
  },
  'messages': {
    key: 'messages',
    label: 'Messages',
    icon: 'mail',
    requiresAuth: true,
    userType: 'seeker'
  },
  'companies': {
    key: 'companies',
    label: 'Companies',
    icon: 'business',
    requiresAuth: false,
    userType: 'seeker'
  },
  'packages': {
    key: 'packages',
    label: 'Packages',
    icon: 'card-giftcard',
    requiresAuth: true,
    userType: 'seeker'
  },
  'payment-history': {
    key: 'payment-history',
    label: 'Payment History',
    icon: 'history',
    requiresAuth: true,
    userType: 'seeker'
  }
};


// Get navigation items for jobseeker
export const getNavigationItems = (): NavigationItem[] => {
  return Object.values(jobseekerNavigation);
};

// Get navigation item by key
export const getNavigationItem = (key: string): NavigationItem | undefined => {
  return jobseekerNavigation[key];
};

// Check if navigation item exists
export const hasNavigationItem = (key: string): boolean => {
  return key in jobseekerNavigation;
};

// Company sidebar navigation (employer)
export interface CompanyNavigationItem {
  key: string;
  label: string;
  icon: string;
}

export const companyNavigation: Record<string, CompanyNavigationItem> = {
  'company-dashboard': { key: 'company-dashboard', label: 'Dashboard', icon: 'dashboard' },
  'company-edit-account': { key: 'company-edit-account', label: 'Edit Account Details', icon: 'edit' },
  'company-public-profile': { key: 'company-public-profile', label: 'Company Public Profile', icon: 'public' },
  'company-post-job': { key: 'company-post-job', label: 'Post a Job', icon: 'add-circle-outline' },
  'company-manage-jobs': { key: 'company-manage-jobs', label: 'Manage Jobs', icon: 'work' },
  'company-cv-packages': { key: 'company-cv-packages', label: 'CV Search Packages', icon: 'search' },
  'company-job-packages': { key: 'company-job-packages', label: 'Job Packages', icon: 'work-outline' },
  'company-payment-history': { key: 'company-payment-history', label: 'Payment History', icon: 'history' },
  'company-unlocked-users': { key: 'company-unlocked-users', label: 'Unlocked Users', icon: 'lock-open' },
  'job-seekers-list': { key: 'job-seekers-list', label: 'Job Seekers', icon: 'people' },
  'company-chat': { key: 'company-chat', label: 'Chat', icon: 'chat' },
  'company-followers': { key: 'company-followers', label: 'Company Followers', icon: 'people' },
};

export const getCompanyNavigationItems = (): CompanyNavigationItem[] => {
  return Object.values(companyNavigation);
};
