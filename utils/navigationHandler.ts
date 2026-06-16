import { hasNavigationItem } from '../config/navigation';

export interface NavigationFunctions {
  onNavigateToJobDetail?: (jobSlug: string) => void;
  onNavigateToJobAlerts?: () => void;
  onNavigateToMyFollowings?: () => void;
  onNavigateToEditProfile?: () => void;
  onNavigateToBuildResume?: () => void;
  onNavigateToMyApplications?: () => void;
  onNavigateToFavouriteJobs?: () => void;
  onNavigateToJobSearch?: (categoryId?: number, categoryName?: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToMessages?: () => void;
  onNavigateToCompanies?: () => void;
  onNavigateToPackages?: () => void;
  onNavigateToPaymentHistory?: () => void;
  onNavigateToApplyJob?: (jobSlug: string, jobTitle: string, companyName?: string) => void;
}

export interface NavigationHandlerProps {
  action: string;
  navigationFunctions: NavigationFunctions;
  onLogout?: () => void;
  userType?: string;
}

/**
 * Centralized navigation handler that automatically maps menu actions to navigation functions
 */
export const handleNavigation = ({
  action,
  navigationFunctions,
  onLogout
}: NavigationHandlerProps): boolean => {
  // Handle logout before checking navigation items (logout is not in the nav config)
  if (action === 'logout') {
    onLogout?.();
    return true;
  }

  // Check if the navigation item exists
  if (!hasNavigationItem(action)) {
    console.warn(`Navigation item "${action}" not found`);
    return false;
  }

  // Map actions to navigation functions
  const actionMap: { [key: string]: keyof NavigationFunctions } = {
    'edit-profile': 'onNavigateToEditProfile',
    'build-resume': 'onNavigateToBuildResume',
    'my-applications': 'onNavigateToMyApplications',
    'favourite-jobs': 'onNavigateToFavouriteJobs',
    'job-search': 'onNavigateToJobSearch',
    'job-alerts': 'onNavigateToJobAlerts',
    'my-followings': 'onNavigateToMyFollowings',
    'profile': 'onNavigateToProfile',
    'messages': 'onNavigateToMessages',
    'companies': 'onNavigateToCompanies',
    'packages': 'onNavigateToPackages',
    'payment-history': 'onNavigateToPaymentHistory'
  };

  const navigationFunctionKey = actionMap[action];
  
  if (navigationFunctionKey && navigationFunctions[navigationFunctionKey]) {
    // Call the navigation function
    const navigationFunction = navigationFunctions[navigationFunctionKey];
    if (typeof navigationFunction === 'function') {
      // Handle functions that require parameters
      if (navigationFunctionKey === 'onNavigateToJobDetail' || navigationFunctionKey === 'onNavigateToApplyJob') {
        // Skip navigation functions that require parameters
        console.warn(`Navigation function "${action}" requires additional parameters`);
        return false;
      }
      // Call functions that don't require parameters
      (navigationFunction as () => void)();
      return true;
    }
  }

  console.warn(`Navigation function not found for action "${action}"`);
  return false;
};

/**
 * Get all available navigation functions
 */
export const getAvailableNavigationFunctions = (
  navigationFunctions: NavigationFunctions
): { [key: string]: () => void } => {
  const availableFunctions: { [key: string]: () => void } = {};
  
  // Map all available navigation functions
  Object.entries(navigationFunctions).forEach(([key, func]) => {
    if (func && typeof func === 'function') {
      availableFunctions[key] = func;
    }
  });

  return availableFunctions;
};
