import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, AppState, AppStateStatus } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Intro from './templates/Intro';
import Login from './templates/auth/Login';
import Register from './templates/auth/Register';
import EmailVerification from './templates/auth/EmailVerification';
import VerificationSuccess from './templates/auth/VerificationSuccess';
import ForgotPassword from './templates/auth/ForgotPassword';
import ResetPasswordCode from './templates/auth/ResetPasswordCode';
import ResetPassword from './templates/auth/ResetPassword';
import Dashboard from './templates/jobseeker/Dashboard';
import JobList from './templates/jobs/JobList';
import JobDetail from './templates/jobs/JobDetail';
import CategoriesList from './templates/categories/CategoriesList';
import CompaniesList from './templates/companies/CompaniesList';
import CompanyDetail from './templates/companies/CompanyDetail';
import EditProfile from './templates/jobseeker/EditProfile';
import BuildResume from './templates/jobseeker/BuildResume';
import MyApplications from './templates/jobseeker/MyApplications';
import FavouriteJobs from './templates/jobseeker/FavouriteJobs';
import JobAlerts from './templates/jobseeker/JobAlerts';
import MyFollowings from './templates/jobseeker/MyFollowings';
import Packages from './templates/jobseeker/Packages';
import PackagePurchase from './templates/jobseeker/PackagePurchase';
import PaymentHistory from './templates/jobseeker/PaymentHistory';
import Home from './templates/jobseeker/Home';
import EmailToFriend from './templates/forms/EmailToFriend';
import EmailToFriendThanks from './templates/forms/EmailToFriendThanks';
import ReportAbuse from './templates/forms/ReportAbuse';
import ReportAbuseThanks from './templates/forms/ReportAbuseThanks';
import ApplyJob from './templates/jobs/ApplyJob';
import CompanyDashboard from './templates/company/CompanyDashboard';
import CompanyEditProfile from './templates/company/CompanyEditProfile';
import CompanyManageJobs from './templates/company/CompanyManageJobs';
import CompanyAppliedCandidates from './templates/company/CompanyAppliedCandidates';
import CompanyPostJob from './templates/company/CompanyPostJob';
import CompanyCvPackages from './templates/company/CompanyCvPackages';
import CompanyJobPackages from './templates/company/CompanyJobPackages';
import CompanyPackagePurchase from './templates/company/CompanyPackagePurchase';
import CompanyPaymentHistory from './templates/company/CompanyPaymentHistory';
import CompanyUnlockedUsers from './templates/company/CompanyUnlockedUsers';
import CompanyFollowers from './templates/company/CompanyFollowers';
import JobSeekersListing from './templates/jobseeker/JobSeekersListing';
import JobSeekerProfile from './templates/jobseeker/JobSeekerProfile';
import ChatConversationList from './templates/chat/ChatConversationList';
import ChatConversation from './templates/chat/ChatConversation';
import { storeAuthData, getAuthData, clearAuthData } from './services/authStorage';
import { userService, notificationService, companyService, chatService } from './services';
import { buildApiUrl } from './config/api';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

type UserType = 'seeker' | 'company';
type ScreenType = 'intro' | 'login' | 'register' | 'email-verification' | 'verification-success' | 'forgot-password' | 'reset-password-code' | 'reset-password' | 'main' | 'seeker-home' | 'job-list' | 'job-detail' | 'apply-job' | 'categories' | 'companies' | 'company-detail' | 'edit-profile' | 'company-edit-account' | 'company-manage-jobs' | 'company-applied-candidates' | 'company-post-job' | 'company-edit-job' | 'company-cv-packages' | 'company-job-packages' | 'company-package-purchase' | 'company-payment-history' | 'company-unlocked-users' | 'company-followers' | 'job-seekers-list' | 'job-seeker-profile' | 'build-resume' | 'my-applications' | 'favourite-jobs' | 'job-alerts' | 'my-followings' | 'messages' | 'chat-conversation' | 'packages' | 'package-purchase' | 'payment-history' | 'email-to-friend' | 'email-to-friend-thanks' | 'report-abuse' | 'report-abuse-thanks';

interface AuthData {
  token: string;
  userId?: string;
  userType?: UserType;
  expiresAt?: string;
  refreshToken?: string;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('intro');
  const [userData, setUserData] = useState<AuthData | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [jobListCategory, setJobListCategory] = useState<{ id: number, name: string } | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<{ slug: string } | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string>('');
  const [resetPasswordEmail, setResetPasswordEmail] = useState<string>('');
  const [resetPasswordCode, setResetPasswordCode] = useState<string>('');
  const [resetPasswordUserType, setResetPasswordUserType] = useState<'candidate' | 'company'>('candidate');
  const [applyJobData, setApplyJobData] = useState<{ slug: string, title: string, companyName?: string } | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [selectedCompanyPackageId, setSelectedCompanyPackageId] = useState<number | null>(null);
  const [selectedCompanyPackageIsFree, setSelectedCompanyPackageIsFree] = useState(false);
  const [selectedCompanyPackageSource, setSelectedCompanyPackageSource] = useState<'job' | 'cv'>('job');
  const [packagesRefreshKey, setPackagesRefreshKey] = useState(0);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [selectedSeekerId, setSelectedSeekerId] = useState<number | null>(null);
  const [selectedAppliedJob, setSelectedAppliedJob] = useState<{ jobId: number; jobTitle: string; companyId: number } | null>(null);
  const [selectedApplicationContext, setSelectedApplicationContext] = useState<{
    applicationId: number;
    jobId: number;
    companyId: number;
    status: 'applied' | 'shortlisted' | 'hired' | 'rejected';
  } | null>(null);
  const [selectedChatConversation, setSelectedChatConversation] = useState<any>(null);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  /** Name/logo/slug for company sidebar + public profile link (API often nests under `company`) */
  const [companyProfile, setCompanyProfile] = useState<{ name?: string; logo?: string; slug?: string } | null>(null);

  /** Laravel sendResponse often puts payload in `message`, not `data` (same as CompanyDashboard). */
  const parseCompanyProfileResponse = (res: { success?: boolean; data?: unknown; message?: unknown }) => {
    if (!res?.success) return null;
    const raw = (res as any).message ?? (res as any).data;
    if (!raw || typeof raw !== 'object') return null;
    const c = (raw as any).company ?? raw;
    if (!c || typeof c !== 'object') return null;
    const name = c.name != null ? String(c.name).trim() : '';
    const logo = c.logo != null && String(c.logo).trim() ? String(c.logo) : undefined;
    const slugRaw = c.slug ?? (c as any).company_slug ?? (c as any).profile_slug;
    const slug = slugRaw != null && String(slugRaw).trim() ? String(slugRaw).trim() : undefined;
    return {
      name: name || undefined,
      logo,
      slug,
    };
  };

  const parseSlugFromCompanyHome = (res: { success?: boolean; data?: unknown; message?: unknown }) => {
    if (!res?.success) return null;
    const raw = (res as any).message ?? (res as any).data;
    if (!raw || typeof raw !== 'object') return null;
    const comp = (raw as any).company;
    if (!comp || typeof comp !== 'object') return null;
    const slugRaw = comp.slug ?? comp.company_slug;
    const slug = slugRaw != null && String(slugRaw).trim() ? String(slugRaw).trim() : undefined;
    const name = comp.name != null ? String(comp.name).trim() : '';
    const logo = comp.logo != null && String(comp.logo).trim() ? String(comp.logo) : undefined;
    return { slug, name: name || undefined, logo };
  };

  // Load company name/logo/slug for sidebar + public profile (home carries slug like dashboard)
  useEffect(() => {
    if (userType !== 'company' || !userData?.token) {
      setCompanyProfile(null);
      return;
    }
    Promise.all([companyService.getCompanyProfile(), companyService.getCompanyHome()])
      .then(([profRes, homeRes]) => {
        const p = parseCompanyProfileResponse(profRes);
        const h = parseSlugFromCompanyHome(homeRes);
        const merged = {
          name: p?.name || h?.name,
          logo: p?.logo || h?.logo,
          slug: p?.slug || h?.slug,
        };
        if (merged.name || merged.logo || merged.slug) {
          setCompanyProfile(merged);
        }
      })
      .catch(() => {});
  }, [userType, userData?.token]);

  // Refresh chat unread count when showing any screen with bottom nav, and when app comes to foreground
  const refreshChatUnreadCount = () => {
    if (!userType || !userData?.token) return;
    chatService.getUnreadCount().then((count) => setChatUnreadCount(count)).catch(() => {});
  };
  useEffect(() => {
    const screensWithBottomNav = [
      'main', 'job-list', 'job-detail', 'messages', 'chat-conversation',
      'my-applications', 'favourite-jobs', 'job-alerts', 'my-followings',
      'packages', 'payment-history', 'build-resume', 'edit-profile', 'companies', 'company-detail',
    ];
    if (!userType || !userData?.token) return;
    if (screensWithBottomNav.includes(currentScreen)) refreshChatUnreadCount();
  }, [currentScreen, userType, userData?.token]);
  useEffect(() => {
    if (!userType || !userData?.token) return;
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') refreshChatUnreadCount();
    });
    return () => sub.remove();
  }, [userType, userData?.token]);

  // Navigation history stack
  const [navigationHistory, setNavigationHistory] = useState<ScreenType[]>([]);

  // Navigation helper functions
  const navigateToScreen = (screen: ScreenType, addToHistory: boolean = true) => {
    if (addToHistory && currentScreen !== screen) {
      setNavigationHistory(prev => [...prev, currentScreen]);
    }
    setCurrentScreen(screen);
  };

  const navigateBack = () => {
    if (navigationHistory.length > 0) {
      const previousScreen = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setCurrentScreen(previousScreen);
    } else {
      // Fallback to main screen if no history
      setCurrentScreen('main');
    }
  };

  const clearNavigationHistory = () => {
    setNavigationHistory([]);
  };

  // Mark user as online when logged in and keep pinging (so web shows correct status)
  useEffect(() => {
    if (!userData?.token) return;
    chatService.updateActivity().catch(() => {});
    const interval = setInterval(() => chatService.updateActivity().catch(() => {}), 120000);
    return () => clearInterval(interval);
  }, [userData?.token]);

  // Check authentication status on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Function to clear potentially corrupted authentication data
  const clearCorruptedAuthData = async () => {
    try {
      const authData = await getAuthData();
      if (authData && authData.token) {
        // Check if token looks valid (basic format check)
        if (authData.token.length < 10 || !authData.token.includes('.')) {
          await clearAuthData();
        }
      }
    } catch (error) {
      // Clear auth data if there's any error
      try {
        await clearAuthData();
      } catch (clearError) {
      }
    }
  };

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const authData = await getAuthData();

      if (authData && authData.token) {
        try {
          const isCompany = authData.userType === 'company';
          const validateUrl = isCompany ? '/company-home' : '/user/profile';
          const response = await fetch(buildApiUrl(validateUrl), {
            headers: {
              'Authorization': `Bearer ${authData.token}`,
              'Accept': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            const isValid = data && (data.success === true || data.user || (isCompany && (data.stats !== undefined || data.company !== undefined)));

            if (isValid) {
              setUserData(authData);
              setAuthToken(authData.token);
              setUserType(authData.userType || 'seeker');
              setCurrentScreen('main');

              if (authData.userType === 'seeker') {
                notificationService.initialize();
              }
            } else {
              await clearAuthData();
              setCurrentScreen('intro');
            }
          } else {
            await clearAuthData();
            setCurrentScreen('intro');
          }
        } catch (err) {
          await clearAuthData();
          setCurrentScreen('intro');
        }
      } else {
        // No auth data, go to intro
        setCurrentScreen('intro');
      }
    } catch (error) {
      // Clear any existing auth data and go to intro
      try {
        await clearAuthData();
      } catch (clearError) {
      }
      setCurrentScreen('intro');
    } finally {
      setIsLoading(false);
    }
  };


  const handleGetStarted = () => {
    setCurrentScreen('register');
  };

  const handleLoginFromIntro = () => {
    setCurrentScreen('login');
  };

  const handleLoginSubmit = async (userData: any) => {
    try {
      const uType = userData.user_type || userData.user?.user_type || 'seeker';
      await storeAuthData({
        token: userData.token,
        userId: userData.user?.id || userData.id,
        userType: uType,
        expiresAt: userData.expires_at,
        refreshToken: userData.refresh_token,
      });

      setUserData({
        token: userData.token,
        userId: userData.user?.id || userData.id,
        userType: uType,
        expiresAt: userData.expires_at,
        refreshToken: userData.refresh_token,
      });

      setAuthToken(userData.token);
      setUserType(uType);
      clearNavigationHistory();
      setCurrentScreen('main');
    } catch (error) {
    }
  };

  const handleRegisterSubmit = async (userData: any) => {
    // Company registration success - logs in directly (no email verification)
    if (userData?.user_type === 'company' && userData?.token) {
      try {
        await storeAuthData({
          token: userData.token,
          userId: userData.id,
          userType: 'company',
          expiresAt: userData.expires_at,
          refreshToken: userData.refresh_token,
        });

        setUserData({
          token: userData.token,
          userId: userData.id,
          userType: 'company',
          expiresAt: userData.expires_at,
          refreshToken: userData.refresh_token,
        });

        setAuthToken(userData.token);
        setUserType('company');
        clearNavigationHistory();
        setCurrentScreen('main');
      } catch (error) {
      }
    }
  };

  const handleEmailVerification = (email: string) => {
    setVerificationEmail(email);
    setCurrentScreen('email-verification');
  };

  const handleVerificationSuccess = async (userData: any) => {
    try {

      // Store authentication data if token exists
      if (userData.token) {
        await storeAuthData({
          token: userData.token,
          userId: userData.id,
          userType: 'seeker',
          expiresAt: userData.expires_at,
          refreshToken: userData.refresh_token,
        });

        // Update state
        setUserData({
          token: userData.token,
          userId: userData.id,
          userType: 'seeker',
          expiresAt: userData.expires_at,
          refreshToken: userData.refresh_token,
        });

        setAuthToken(userData.token);
        setUserType('seeker');
      }

      // Show success screen first
      setCurrentScreen('verification-success');
    } catch (error) {
      // Still show success screen even if storage fails
      setCurrentScreen('verification-success');
    }
  };

  const handleContinueToDashboard = () => {
    clearNavigationHistory(); // Clear history on successful verification
    setCurrentScreen('main');
  };

  const handleResendCode = () => {
    // This can be used for analytics or logging
  };

  const handleForgotPassword = (userType?: 'candidate' | 'company') => {
    setResetPasswordUserType(userType ?? 'candidate');
    setCurrentScreen('forgot-password');
  };

  const handleForgotPasswordSuccess = (email: string) => {
    setResetPasswordEmail(email);
    setCurrentScreen('reset-password-code');
  };

  const handleResetPasswordCodeSuccess = (email: string, code: string) => {
    setResetPasswordEmail(email);
    setResetPasswordCode(code);
    setCurrentScreen('reset-password');
  };

  const handleResetPasswordSuccess = () => {
    setCurrentScreen('login');
  };

  const handleLogout = async () => {
    try {
      await clearAuthData();
      userService.clearUserData(); // Clear global user data
      setUserData(null);
      setAuthToken(null);
      setUserType(null);
      clearNavigationHistory(); // Clear history on logout
      setCurrentScreen('intro'); // Go back to intro page after logout
    } catch (error) {
    }
  };

  // Function to clear invalid auth data
  const clearInvalidAuth = async () => {
    try {
      await clearAuthData();
      userService.clearUserData(); // Clear global user data
      setUserData(null);
      setAuthToken(null);
      setUserType(null);
      setCurrentScreen('intro');
    } catch (error) {
    }
  };

  const handleMenuPress = () => {
    // Handle menu press - you can implement navigation logic here
  };

  const handleCompanyMenuPress = (key: string) => {
    if (key === 'company-dashboard') navigateToScreen('main');
    else if (key === 'company-edit-account') navigateToScreen('company-edit-account');
    else if (key === 'company-public-profile') {
      const openPublic = (slug: string) => {
        setSelectedCompany({ slug });
        navigateToScreen('company-detail');
      };
      if (companyProfile?.slug) {
        openPublic(companyProfile.slug);
        return;
      }
      Promise.all([companyService.getCompanyHome(), companyService.getCompanyProfile()])
        .then(([homeRes, profRes]) => {
          const h = parseSlugFromCompanyHome(homeRes);
          const p = parseCompanyProfileResponse(profRes);
          const slug = h?.slug || p?.slug;
          if (slug) {
            setCompanyProfile((prev) => ({
              ...(prev ?? {}),
              name: p?.name || h?.name || prev?.name,
              logo: p?.logo || h?.logo || prev?.logo,
              slug,
            }));
            openPublic(slug);
          } else {
            Alert.alert(
              'Company profile',
              'Could not find your public profile address. Open Edit Account on the website and ensure your company has a profile slug, then try again.'
            );
          }
        })
        .catch(() => {
          Alert.alert('Company profile', 'Could not load company data. Please try again.');
        });
    } else if (key === 'company-manage-jobs') navigateToScreen('company-manage-jobs');
    else if (key === 'company-post-job') navigateToScreen('company-post-job');
    else if (key === 'company-cv-packages') navigateToScreen('company-cv-packages');
    else if (key === 'company-job-packages') navigateToScreen('company-job-packages');
    else if (key === 'company-payment-history') navigateToScreen('company-payment-history');
    else if (key === 'company-unlocked-users') navigateToScreen('company-unlocked-users');
    else if (key === 'job-seekers-list') navigateToScreen('job-seekers-list');
    else if (key === 'company-followers') navigateToScreen('company-followers');
    else if (key === 'company-chat') navigateToScreen('messages');
  };

  /** Same tab bar as dashboard: keeps layout consistent so sidebar/menu aren’t tied to “screens without nav”. */
  const handleCompanyBottomTab = (tab: import('./templates/company/CompanyBottomNav').CompanyTabId) => {
    if (tab === 'home') {
      clearNavigationHistory();
      setCurrentScreen('main');
    } else if (tab === 'profile') navigateToScreen('company-edit-account');
    else if (tab === 'packages') navigateToScreen('company-job-packages');
    else if (tab === 'post-job') navigateToScreen('company-post-job');
    else if (tab === 'chat') navigateToScreen('messages');
  };

  const handleBack = () => {
    navigateBack();
  };

  const handleJobPress = (job: any) => {
    setSelectedJob(job);
    navigateToScreen('job-detail');
  };

  const handleNavigateToJobDetail = (jobSlug: string) => {
    setSelectedJob({ slug: jobSlug });
    navigateToScreen('job-detail');
  };

  const handleNavigateToApplyJob = (jobSlug: string, jobTitle: string, companyName?: string) => {
    setApplyJobData({ slug: jobSlug, title: jobTitle, companyName });
    navigateToScreen('apply-job');
  };

  const handleNavigateToJobAlerts = () => {
    navigateToScreen('job-alerts');
  };

  const handleNavigateToMyFollowings = () => {
    navigateToScreen('my-followings');
  };

  const handleNavigateToMessages = () => {
    navigateToScreen('messages');
  };

  // Add missing navigation functions for Dashboard
  const handleNavigateToEditProfile = () => {
    navigateToScreen('edit-profile');
  };

  const handleNavigateToBuildResume = () => {
    navigateToScreen('build-resume');
  };

  const handleNavigateToMyApplications = () => {
    navigateToScreen('my-applications');
  };

  const handleNavigateToFavouriteJobs = () => {
    navigateToScreen('favourite-jobs');
  };

  const handleNavigateToJobSearch = (categoryId?: number, categoryName?: string) => {
    // Store category info for JobList component
    if (categoryId && categoryName) {
      setJobListCategory({ id: categoryId, name: categoryName });
    } else {
      setJobListCategory(null);
    }
    navigateToScreen('job-list');
  };

  const handleNavigateToCategories = () => {
    navigateToScreen('categories');
  };

  const handleNavigateToCompanies = () => {
    navigateToScreen('companies');
  };

  const handleNavigateToCompanyDetail = (companySlug: string) => {
    setSelectedCompany({ slug: companySlug });
    navigateToScreen('company-detail');
  };

  const handleBackToCompanies = () => {
    setCurrentScreen('companies');
  };

  const handleNavigateToProfile = () => {
    setCurrentScreen('edit-profile'); // Using edit-profile as profile screen
  };

  const handleNavigateToPackages = () => {
    navigateToScreen('packages');
  };

  const handleNavigateToPackagePurchase = (packageId: number) => {
    setSelectedPackageId(packageId);
    navigateToScreen('package-purchase');
  };

  const handleNavigateToPaymentHistory = () => {
    navigateToScreen('payment-history');
  };

  const handleNavigateToEmailToFriend = () => {
    setCurrentScreen('email-to-friend');
  };

  const handleNavigateToReportAbuse = () => {
    setCurrentScreen('report-abuse');
  };

  const handleNavigateToCompanyPackagePurchase = (packageId: number, isFree: boolean, source: 'job' | 'cv' = 'job') => {
    const id = Number(packageId);
    if (!Number.isFinite(id) || id < 1) return;
    setSelectedCompanyPackageId(id);
    setSelectedCompanyPackageIsFree(isFree);
    setSelectedCompanyPackageSource(source);
    setCurrentScreen('company-package-purchase');
  };

  // Back navigation function
  const handleBackToDashboard = () => {
    setCurrentScreen('main');
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#fff', '#E4F4EC']} style={styles.gradientBackground}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const renderScreen = () => {
    // Render screens based on current state
    if (currentScreen === 'intro') {
      return (
        <Intro
          onGetStarted={handleGetStarted}
          onLogin={handleLoginFromIntro}
        />
      );
    }

    if (currentScreen === 'login') {
      return (
        <Login
          onLogin={handleLoginSubmit}
          onRegister={() => setCurrentScreen('register')}
          onBack={() => setCurrentScreen('intro')}
          onForgotPassword={handleForgotPassword}
        />
      );
    }

    if (currentScreen === 'register') {
      return (
        <Register
          onRegister={handleRegisterSubmit}
          onLogin={() => setCurrentScreen('login')}
          onBack={() => setCurrentScreen('intro')}
          onEmailVerification={handleEmailVerification}
        />
      );
    }

    if (currentScreen === 'email-verification') {
      return (
        <EmailVerification
          email={verificationEmail}
          onVerificationSuccess={handleVerificationSuccess}
          onBack={() => setCurrentScreen('register')}
          onResendCode={handleResendCode}
        />
      );
    }

    if (currentScreen === 'verification-success') {
      return (
        <VerificationSuccess
          onContinue={handleContinueToDashboard}
        />
      );
    }

    if (currentScreen === 'forgot-password') {
      return (
        <ForgotPassword
          userType={resetPasswordUserType}
          onBack={() => setCurrentScreen('login')}
          onSuccess={handleForgotPasswordSuccess}
        />
      );
    }

    if (currentScreen === 'reset-password-code') {
      return (
        <ResetPasswordCode
          email={resetPasswordEmail}
          userType={resetPasswordUserType}
          onBack={() => setCurrentScreen('forgot-password')}
          onSuccess={handleResetPasswordCodeSuccess}
        />
      );
    }

    if (currentScreen === 'reset-password') {
      return (
        <ResetPassword
          email={resetPasswordEmail}
          resetCode={resetPasswordCode}
          userType={resetPasswordUserType}
          onBack={() => setCurrentScreen('reset-password-code')}
          onSuccess={handleResetPasswordSuccess}
        />
      );
    }

    // Main authenticated app flow
    if (currentScreen === 'main') {
      if (userType === 'company') {
        return (
          <CompanyDashboard
            onLogout={handleLogout}
            onEditProfile={() => navigateToScreen('company-edit-account')}
            onViewJobPackages={() => navigateToScreen('company-job-packages')}
            onViewCvPackages={() => navigateToScreen('company-cv-packages')}
            onPostJob={() => navigateToScreen('company-post-job')}
            onNavigateToMessages={() => navigateToScreen('messages')}
            chatUnreadCount={chatUnreadCount}
            onJobPress={(job) => {
              setSelectedJob(job?.slug ? { slug: job.slug } : { slug: String(job?.id ?? '') });
              navigateToScreen('job-detail');
            }}
            onCandidatePress={(id) => {
              setSelectedSeekerId(Number(id));
              setCurrentScreen('job-seeker-profile');
            }}
            onOpenCompanyPublicProfile={(slug) => {
              setSelectedCompany({ slug });
              navigateToScreen('company-detail');
            }}
            onCompanyMenuPress={(key) => {
              if (key === 'company-dashboard') navigateToScreen('main');
              else if (key === 'company-edit-account') navigateToScreen('company-edit-account');
              else if (key === 'company-manage-jobs') navigateToScreen('company-manage-jobs');
              else if (key === 'company-post-job') navigateToScreen('company-post-job');
              else if (key === 'company-cv-packages') navigateToScreen('company-cv-packages');
              else if (key === 'company-job-packages') navigateToScreen('company-job-packages');
              else if (key === 'company-payment-history') navigateToScreen('company-payment-history');
              else if (key === 'company-unlocked-users') navigateToScreen('company-unlocked-users');
              else if (key === 'job-seekers-list') navigateToScreen('job-seekers-list');
              else if (key === 'company-followers') navigateToScreen('company-followers');
              else if (key === 'company-chat') navigateToScreen('messages');
            }}
          />
        );
      }
      if (userType === 'seeker') {
        return (
          <Dashboard
            onMenuPress={handleMenuPress}
            onNavigateToJobDetail={handleNavigateToJobDetail}
            onNavigateToJobAlerts={handleNavigateToJobAlerts}
            onNavigateToMyFollowings={handleNavigateToMyFollowings}
            onLogout={handleLogout}
            onNavigateToEditProfile={handleNavigateToEditProfile}
            onNavigateToBuildResume={handleNavigateToBuildResume}
            onNavigateToMyApplications={handleNavigateToMyApplications}
            onNavigateToFavouriteJobs={handleNavigateToFavouriteJobs}
            onNavigateToJobSearch={handleNavigateToJobSearch}
            onNavigateToCategories={handleNavigateToCategories}
            onNavigateToCompanies={handleNavigateToCompanies}
            onNavigateToCompanyDetail={handleNavigateToCompanyDetail}
            onNavigateToProfile={handleNavigateToProfile}
            onNavigateToMessages={handleNavigateToMessages}
            onNavigateToPackages={handleNavigateToPackages}
            onNavigateToPaymentHistory={handleNavigateToPaymentHistory}
            onNavigateToApplyJob={handleNavigateToApplyJob}
            messageUnreadCount={chatUnreadCount}
          />
        );
      }
    }

    // Other screens
    if (currentScreen === 'seeker-home') {
      return (
        <Home
          onJobPress={handleJobPress}
          onMenuPress={handleMenuPress}
        />
      );
    }


    if (currentScreen === 'job-list') {
      return (
        <JobList
          onJobPress={handleJobPress}
          onMenuPress={handleMenuPress}
          onBack={handleBack}
          categoryId={jobListCategory?.id}
          categoryName={jobListCategory?.name}
          onNavigateToJobDetail={handleNavigateToJobDetail}
          onNavigateToJobAlerts={handleNavigateToJobAlerts}
          onNavigateToMyFollowings={handleNavigateToMyFollowings}
          onNavigateToEditProfile={handleNavigateToEditProfile}
          onNavigateToBuildResume={handleNavigateToBuildResume}
          onNavigateToMyApplications={handleNavigateToMyApplications}
          onNavigateToFavouriteJobs={handleNavigateToFavouriteJobs}
          onNavigateToJobSearch={handleNavigateToJobSearch}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToMessages={handleNavigateToMessages}
          onNavigateToCompanies={handleNavigateToCompanies}
          onNavigateToPackages={handleNavigateToPackages}
          onNavigateToPaymentHistory={handleNavigateToPaymentHistory}
          messageUnreadCount={chatUnreadCount}
        />
      );
    }

    if (currentScreen === 'job-detail' && selectedJob) {
      return (
        <JobDetail
          onBack={handleBack}
          onMenuPress={handleMenuPress}
          onApply={() => { }}
          jobSlug={selectedJob.slug}
          messageUnreadCount={chatUnreadCount}
          loggedInUserType={userType ?? 'seeker'}
          onCompanyMenuPress={userType === 'company' ? handleCompanyMenuPress : undefined}
          onCompanyNavPress={userType === 'company' ? handleCompanyBottomTab : undefined}
          onLogout={userType === 'company' ? handleLogout : undefined}
          companyName={userType === 'company' ? companyProfile?.name : undefined}
          companyLogo={userType === 'company' ? companyProfile?.logo : undefined}
          onNavigateToJobDetail={handleNavigateToJobDetail}
          onNavigateToJobAlerts={handleNavigateToJobAlerts}
          onNavigateToMyFollowings={handleNavigateToMyFollowings}
          onNavigateToEditProfile={handleNavigateToEditProfile}
          onNavigateToBuildResume={handleNavigateToBuildResume}
          onNavigateToMyApplications={handleNavigateToMyApplications}
          onNavigateToFavouriteJobs={handleNavigateToFavouriteJobs}
          onNavigateToJobSearch={handleNavigateToJobSearch}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToMessages={handleNavigateToMessages}
          onNavigateToCompanies={handleNavigateToCompanies}
          onNavigateToPackages={handleNavigateToPackages}
          onNavigateToPaymentHistory={handleNavigateToPaymentHistory}
          onNavigateToEmailToFriend={handleNavigateToEmailToFriend}
          onNavigateToReportAbuse={handleNavigateToReportAbuse}
          onNavigateToApplyJob={handleNavigateToApplyJob}
          onNavigateToCompanyDetail={handleNavigateToCompanyDetail}
        />
      );
    }

    if (currentScreen === 'apply-job' && applyJobData) {
      return (
        <ApplyJob
          onBack={handleBack}
          jobSlug={applyJobData.slug}
          jobTitle={applyJobData.title}
          companyName={applyJobData.companyName}
          onNavigateToDashboard={() => navigateToScreen('main')}
          onNavigateToJobSearch={() => navigateToScreen('job-list')}
        />
      );
    }

    if (currentScreen === 'categories') {
      return (
        <CategoriesList
          onBack={handleBack}
          onNavigateToJobSearch={handleNavigateToJobSearch}
        />
      );
    }

    if (currentScreen === 'companies') {
      return (
        <CompaniesList
          onBack={handleBack}
          messageUnreadCount={chatUnreadCount}
          onNavigateToJobSearch={handleNavigateToJobSearch}
          onNavigateToJobDetail={handleNavigateToJobDetail}
          onNavigateToJobAlerts={handleNavigateToJobAlerts}
          onNavigateToMyFollowings={handleNavigateToMyFollowings}
          onNavigateToEditProfile={handleNavigateToEditProfile}
          onNavigateToBuildResume={handleNavigateToBuildResume}
          onNavigateToMyApplications={handleNavigateToMyApplications}
          onNavigateToFavouriteJobs={handleNavigateToFavouriteJobs}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToMessages={handleNavigateToMessages}
          onNavigateToCompanies={handleNavigateToCompanies}
          onNavigateToCompanyDetail={handleNavigateToCompanyDetail}
          onNavigateToPackages={handleNavigateToPackages}
          onNavigateToPaymentHistory={handleNavigateToPaymentHistory}
          onLogout={handleLogout}
          userData={userData ? {
            name: '',
            email: '',
            profile_image: undefined,
            cover_image: undefined,
          } : null}
        />
      );
    }

    if (currentScreen === 'company-detail' && selectedCompany) {
      return (
        <CompanyDetail
          onBack={handleBackToDashboard}
          companySlug={selectedCompany.slug}
          messageUnreadCount={chatUnreadCount}
          loggedInUserType={userType ?? 'seeker'}
          onCompanyMenuPress={userType === 'company' ? handleCompanyMenuPress : undefined}
          onLogout={userType === 'company' ? handleLogout : undefined}
          companyName={userType === 'company' ? companyProfile?.name : undefined}
          companyLogo={userType === 'company' ? companyProfile?.logo : undefined}
          onNavigateToJobDetail={handleNavigateToJobDetail}
          onNavigateToJobAlerts={handleNavigateToJobAlerts}
          onNavigateToMyFollowings={handleNavigateToMyFollowings}
          onNavigateToEditProfile={handleNavigateToEditProfile}
          onNavigateToBuildResume={handleNavigateToBuildResume}
          onNavigateToMyApplications={handleNavigateToMyApplications}
          onNavigateToFavouriteJobs={handleNavigateToFavouriteJobs}
          onNavigateToJobSearch={handleNavigateToJobSearch}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToMessages={handleNavigateToMessages}
          onNavigateToCompanies={handleNavigateToCompanies}
          onNavigateToPackages={handleNavigateToPackages}
          onNavigateToPaymentHistory={handleNavigateToPaymentHistory}
        />
      );
    }

    if (currentScreen === 'edit-profile') {
      return (
        <EditProfile
          onMenuPress={handleMenuPress}
          onBack={handleBackToDashboard}
          messageUnreadCount={chatUnreadCount}
          onNavigateToJobDetail={handleNavigateToJobDetail}
          onNavigateToJobAlerts={handleNavigateToJobAlerts}
          onNavigateToMyFollowings={handleNavigateToMyFollowings}
          onNavigateToEditProfile={handleNavigateToEditProfile}
          onNavigateToBuildResume={handleNavigateToBuildResume}
          onNavigateToMyApplications={handleNavigateToMyApplications}
          onNavigateToFavouriteJobs={handleNavigateToFavouriteJobs}
          onNavigateToJobSearch={handleNavigateToJobSearch}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToMessages={handleNavigateToMessages}
          onNavigateToCompanies={handleNavigateToCompanies}
          onNavigateToPackages={handleNavigateToPackages}
          onNavigateToPaymentHistory={handleNavigateToPaymentHistory}
        />
      );
    }

    if (currentScreen === 'company-edit-account') {
      return (
        <CompanyEditProfile
          onBack={handleBack}
          onSuccess={() => {}}
          onCompanyMenuPress={handleCompanyMenuPress}
          onLogout={handleLogout}
          companyName={companyProfile?.name}
          companyLogo={companyProfile?.logo}
          onCompanyNavPress={handleCompanyBottomTab}
          chatUnreadCount={chatUnreadCount}
          bottomNavActiveTab="profile"
        />
      );
    }

    if (currentScreen === 'company-manage-jobs') {
      return (
        <CompanyManageJobs
          onBack={handleBack}
          onEditJob={(job) => {
            setEditingJobId(job.id);
            setNavigationHistory(prev => [...prev, currentScreen]);
            setCurrentScreen('company-edit-job');
          }}
          onViewCandidates={(job) => {
            setSelectedAppliedJob({
              jobId: job.id,
              jobTitle: job.title || '',
              companyId: job.company_id ?? job.company?.id ?? 0,
            });
            setSelectedApplicationContext(null);
            navigateToScreen('company-applied-candidates');
          }}
          onCompanyMenuPress={handleCompanyMenuPress}
          onLogout={handleLogout}
          onCompanyNavPress={handleCompanyBottomTab}
          chatUnreadCount={chatUnreadCount}
          menuCompanyName={companyProfile?.name}
          menuCompanyLogo={companyProfile?.logo}
        />
      );
    }

    if (currentScreen === 'company-applied-candidates' && selectedAppliedJob) {
      return (
        <CompanyAppliedCandidates
          jobId={selectedAppliedJob.jobId}
          jobTitle={selectedAppliedJob.jobTitle}
          companyId={selectedAppliedJob.companyId}
          onBack={handleBack}
          onViewProfile={(seekerId, application) => {
            setSelectedSeekerId(seekerId);
            setSelectedApplicationContext({
              applicationId: application.applicationId,
              jobId: application.jobId,
              companyId: application.companyId,
              status: application.status,
            });
            navigateToScreen('job-seeker-profile');
          }}
          onCompanyMenuPress={handleCompanyMenuPress}
          onLogout={handleLogout}
          onCompanyNavPress={handleCompanyBottomTab}
          chatUnreadCount={chatUnreadCount}
          menuCompanyName={companyProfile?.name}
          menuCompanyLogo={companyProfile?.logo}
        />
      );
    }

    if (currentScreen === 'company-post-job') {
      return (
        <CompanyPostJob
          onBack={handleBack}
          onCompanyMenuPress={handleCompanyMenuPress}
          onLogout={handleLogout}
          onCompanyNavPress={handleCompanyBottomTab}
          chatUnreadCount={chatUnreadCount}
          bottomNavActiveTab="post-job"
          menuCompanyName={companyProfile?.name}
          menuCompanyLogo={companyProfile?.logo}
        />
      );
    }

    if (currentScreen === 'company-edit-job' && editingJobId != null) {
      return (
        <CompanyPostJob
          jobId={editingJobId}
          onBack={() => {
            setEditingJobId(null);
            handleBack();
          }}
          onSuccess={() => setEditingJobId(null)}
          onCompanyMenuPress={handleCompanyMenuPress}
          onLogout={handleLogout}
          onCompanyNavPress={handleCompanyBottomTab}
          chatUnreadCount={chatUnreadCount}
          bottomNavActiveTab="post-job"
          menuCompanyName={companyProfile?.name}
          menuCompanyLogo={companyProfile?.logo}
        />
      );
    }

    if (currentScreen === 'company-cv-packages') {
      return (
        <CompanyCvPackages
          onBack={handleBack}
          onNavigateToPackagePurchase={handleNavigateToCompanyPackagePurchase}
          onCompanyMenuPress={handleCompanyMenuPress}
          onLogout={handleLogout}
          onCompanyNavPress={handleCompanyBottomTab}
          chatUnreadCount={chatUnreadCount}
          bottomNavActiveTab="packages"
          menuCompanyName={companyProfile?.name}
          menuCompanyLogo={companyProfile?.logo}
        />
      );
    }

    if (currentScreen === 'company-job-packages') {
      return (
        <CompanyJobPackages
          onBack={handleBack}
          onNavigateToPackagePurchase={handleNavigateToCompanyPackagePurchase}
          onCompanyMenuPress={handleCompanyMenuPress}
          onLogout={handleLogout}
          onCompanyNavPress={handleCompanyBottomTab}
          chatUnreadCount={chatUnreadCount}
          bottomNavActiveTab="packages"
          menuCompanyName={companyProfile?.name}
          menuCompanyLogo={companyProfile?.logo}
        />
      );
    }

    if (currentScreen === 'company-package-purchase' && selectedCompanyPackageId != null && Number(selectedCompanyPackageId) >= 1) {
      const returnScreen = selectedCompanyPackageSource === 'cv' ? 'company-cv-packages' : 'company-job-packages';
      return (
        <CompanyPackagePurchase
          packageId={selectedCompanyPackageId}
          isFree={selectedCompanyPackageIsFree}
          onBack={() => { setSelectedCompanyPackageId(null); setCurrentScreen(returnScreen); }}
          onSuccess={() => { setSelectedCompanyPackageId(null); setCurrentScreen(returnScreen); }}
        />
      );
    }

    if (currentScreen === 'company-payment-history') {
      return (
        <CompanyPaymentHistory
          onBack={handleBack}
          chatUnreadCount={chatUnreadCount}
          onTabPress={(tab) => {
            if (tab === 'profile') navigateToScreen('company-edit-account');
            else if (tab === 'packages') navigateToScreen('company-job-packages');
            else if (tab === 'post-job') navigateToScreen('company-post-job');
            else if (tab === 'chat') navigateToScreen('messages');
          }}
          onCompanyMenuPress={handleCompanyMenuPress}
          onLogout={handleLogout}
          menuCompanyName={companyProfile?.name}
          menuCompanyLogo={companyProfile?.logo}
        />
      );
    }

    if (currentScreen === 'company-unlocked-users') {
      return (
        <CompanyUnlockedUsers
          onBack={handleBack}
          onUserPress={(user) => {
            const userId = user?.id ?? user?.user_id;
            if (userId != null) {
              setSelectedSeekerId(Number(userId));
              setSelectedApplicationContext(null);
              navigateToScreen('job-seeker-profile');
            }
          }}
          onChatWithUser={async (user) => {
            const userId = user?.id ?? user?.user_id;
            if (userId == null) return;
            const res = await chatService.startConversation(Number(userId));
            if (res.success && res.data) {
              setSelectedChatConversation(res.data);
              navigateToScreen('chat-conversation');
            }
          }}
          onCompanyMenuPress={handleCompanyMenuPress}
          onLogout={handleLogout}
          onCompanyNavPress={handleCompanyBottomTab}
          chatUnreadCount={chatUnreadCount}
          menuCompanyName={companyProfile?.name}
          menuCompanyLogo={companyProfile?.logo}
        />
      );
    }

    if (currentScreen === 'company-followers') {
      return (
        <CompanyFollowers
          onBack={handleBack}
          onUserPress={(user) => {
            const userId = user.id ?? user.user_id;
            if (userId != null) {
              setSelectedSeekerId(Number(userId));
              setSelectedApplicationContext(null);
              navigateToScreen('job-seeker-profile');
            }
          }}
          onCompanyNavPress={userType === 'company' ? (tab) => {
            if (tab === 'profile') navigateToScreen('company-edit-account');
            else if (tab === 'packages') navigateToScreen('company-job-packages');
            else if (tab === 'post-job') navigateToScreen('company-post-job');
            else if (tab === 'chat') navigateToScreen('messages');
          } : undefined}
          chatUnreadCount={chatUnreadCount}
          onCompanyMenuPress={handleCompanyMenuPress}
          onLogout={handleLogout}
          menuCompanyName={companyProfile?.name}
          menuCompanyLogo={companyProfile?.logo}
        />
      );
    }

    if (currentScreen === 'job-seekers-list') {
      return (
        <JobSeekersListing
          onBack={handleBack}
          onViewProfile={(seekerId) => {
            setSelectedSeekerId(seekerId);
            navigateToScreen('job-seeker-profile');
          }}
          onCompanyNavPress={userType === 'company' ? (tab) => {
            if (tab === 'profile') navigateToScreen('company-edit-account');
            else if (tab === 'packages') navigateToScreen('company-job-packages');
            else if (tab === 'post-job') navigateToScreen('company-post-job');
            else if (tab === 'chat') navigateToScreen('messages');
          } : undefined}
          chatUnreadCount={chatUnreadCount}
          onCompanyMenuPress={userType === 'company' ? handleCompanyMenuPress : undefined}
          onLogout={userType === 'company' ? handleLogout : undefined}
          menuCompanyName={userType === 'company' ? companyProfile?.name : undefined}
          menuCompanyLogo={userType === 'company' ? companyProfile?.logo : undefined}
        />
      );
    }

    if (currentScreen === 'job-seeker-profile' && selectedSeekerId != null) {
      const fromApplied = !!selectedApplicationContext;
      return (
        <JobSeekerProfile
          seekerId={selectedSeekerId}
          onBack={() => {
            if (fromApplied) setSelectedApplicationContext(null);
            handleBack();
          }}
          source={fromApplied ? 'application' : 'direct'}
          applicationContext={fromApplied && selectedApplicationContext ? {
            jobId: selectedApplicationContext.jobId,
            applicationId: selectedApplicationContext.applicationId,
            companyId: selectedApplicationContext.companyId,
            isShortlisted: selectedApplicationContext.status === 'shortlisted',
            isHired: selectedApplicationContext.status === 'hired',
            applicationStatus: selectedApplicationContext.status,
          } : undefined}
          onApplicationStatusChange={fromApplied && selectedApplicationContext ? async (newStatus) => {
            const ctx = selectedApplicationContext;
            const prevStatus = ctx.status;
            const statusLabel = newStatus === 'shortlisted' ? i18n.t('status_shortlisted') : newStatus === 'hired' ? i18n.t('status_hired') : newStatus === 'rejected' ? i18n.t('status_rejected') : i18n.t('status_applied');

            // Optimistic update: update context and show success immediately, return true so modal closes
            setSelectedApplicationContext((prev) => prev ? { ...prev, status: newStatus } : null);
            Alert.alert(i18n.t('success'), i18n.t('moved_user_to_status', { status: statusLabel }));

            // API call in background; revert on failure
            companyService.setApplicationStatus(ctx.applicationId, selectedSeekerId, ctx.jobId, ctx.companyId, newStatus, prevStatus).then((res) => {
              if (!(res as any)?.success && (res as any)?.data?.success !== 'done') {
                setSelectedApplicationContext((prev) => prev ? { ...prev, status: prevStatus } : null);
                const errMsg = typeof (res as any)?.error === 'string' ? (res as any).error : (res as any)?.message ?? i18n.t('something_went_wrong');
                Alert.alert(i18n.t('error'), String(errMsg));
              }
            }).catch((e) => {
              setSelectedApplicationContext((prev) => prev ? { ...prev, status: prevStatus } : null);
              Alert.alert(i18n.t('error'), (e instanceof Error ? e.message : String(e)) || i18n.t('something_went_wrong'));
            });

            return true;
          } : undefined}
          onUnlockProfile={userType === 'company' ? async (userId) => {
            const el = await companyService.getCvUnlockEligibility();
            if (!el.apiOk) {
              Alert.alert(i18n.t('error'), i18n.t('cv_unlock_could_not_verify'));
              return false;
            }
            if (el.cvPackagesFeatureEnabled && !el.canUnlock) {
              Alert.alert(i18n.t('cv_unlock_needs_package_title'), i18n.t('cv_unlock_needs_package_body'), [
                { text: i18n.t('cancel') || 'Cancel', style: 'cancel' },
                {
                  text: i18n.t('company_view_cv_packages'),
                  onPress: () => navigateToScreen('company-cv-packages'),
                },
              ]);
              return false;
            }
            const res = await companyService.unlockCandidate(userId);
            if (res.success === true) return true;
            const msg = (res as any)?.message ?? (res as any)?.error ?? i18n.t('something_went_wrong');
            Alert.alert(i18n.t('error'), typeof msg === 'string' ? msg : i18n.t('unlock_failed_hint'));
            return false;
          } : undefined}
          onCompanyNavPress={userType === 'company' ? (tab) => {
            if (tab === 'profile') navigateToScreen('company-edit-account');
            else if (tab === 'packages') navigateToScreen('company-job-packages');
            else if (tab === 'post-job') navigateToScreen('company-post-job');
            else if (tab === 'chat') navigateToScreen('messages');
          } : undefined}
          chatUnreadCount={chatUnreadCount}
          onCompanyMenuPress={userType === 'company' ? handleCompanyMenuPress : undefined}
          onLogout={userType === 'company' ? handleLogout : undefined}
          menuCompanyName={userType === 'company' ? companyProfile?.name : undefined}
          menuCompanyLogo={userType === 'company' ? companyProfile?.logo : undefined}
          onStartChat={userType === 'company' ? async (user) => {
            const uid = user?.id ?? user?.user_id;
            if (uid == null) return;
            const res = await chatService.startConversation(Number(uid));
            if (res.success && res.data) {
              setSelectedChatConversation(res.data);
              navigateToScreen('chat-conversation');
            }
          } : undefined}
        />
      );
    }

    if (currentScreen === 'build-resume') {
      return (
        <BuildResume
          onMenuPress={handleMenuPress}
          onBack={handleBackToDashboard}
          messageUnreadCount={chatUnreadCount}
          onNavigateToJobDetail={handleNavigateToJobDetail}
          onNavigateToJobAlerts={handleNavigateToJobAlerts}
          onNavigateToMyFollowings={handleNavigateToMyFollowings}
          onNavigateToEditProfile={handleNavigateToEditProfile}
          onNavigateToBuildResume={handleNavigateToBuildResume}
          onNavigateToMyApplications={handleNavigateToMyApplications}
          onNavigateToFavouriteJobs={handleNavigateToFavouriteJobs}
          onNavigateToCompanies={handleNavigateToCompanies}
          onNavigateToJobSearch={handleNavigateToJobSearch}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToMessages={handleNavigateToMessages}
          onNavigateToPackages={handleNavigateToPackages}
          onNavigateToPaymentHistory={handleNavigateToPaymentHistory}
        />
      );
    }

    if (currentScreen === 'my-applications') {
      return (
        <MyApplications
          onMenuPress={handleMenuPress}
          onNavigateToJobDetail={handleNavigateToJobDetail}
          onBack={handleBackToDashboard}
          onNavigateToJobAlerts={handleNavigateToJobAlerts}
          onNavigateToMyFollowings={handleNavigateToMyFollowings}
          onNavigateToEditProfile={handleNavigateToEditProfile}
          onNavigateToBuildResume={handleNavigateToBuildResume}
          onNavigateToMyApplications={handleNavigateToMyApplications}
          onNavigateToFavouriteJobs={handleNavigateToFavouriteJobs}
          onNavigateToJobSearch={handleNavigateToJobSearch}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToMessages={handleNavigateToMessages}
          onNavigateToCompanies={handleNavigateToCompanies}
          onNavigateToPackages={handleNavigateToPackages}
          onNavigateToPaymentHistory={handleNavigateToPaymentHistory}
          messageUnreadCount={chatUnreadCount}
        />
      );
    }

    if (currentScreen === 'favourite-jobs') {
      return (
        <FavouriteJobs
          onMenuPress={handleMenuPress}
          onNavigateToJobDetail={handleNavigateToJobDetail}
          onBack={handleBackToDashboard}
          onNavigateToJobAlerts={handleNavigateToJobAlerts}
          onNavigateToMyFollowings={handleNavigateToMyFollowings}
          onNavigateToEditProfile={handleNavigateToEditProfile}
          onNavigateToBuildResume={handleNavigateToBuildResume}
          onNavigateToMyApplications={handleNavigateToMyApplications}
          onNavigateToFavouriteJobs={handleNavigateToFavouriteJobs}
          onNavigateToCompanies={handleNavigateToCompanies}
          onNavigateToJobSearch={handleNavigateToJobSearch}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToMessages={handleNavigateToMessages}
          onNavigateToPackages={handleNavigateToPackages}
          onNavigateToPaymentHistory={handleNavigateToPaymentHistory}
          messageUnreadCount={chatUnreadCount}
        />
      );
    }

    if (currentScreen === 'job-alerts') {
      return (
        <JobAlerts
          onMenuPress={handleMenuPress}
          messageUnreadCount={chatUnreadCount}
          onBack={handleBackToDashboard}
          onNavigateToJobDetail={handleNavigateToJobDetail}
          onNavigateToJobAlerts={handleNavigateToJobAlerts}
          onNavigateToMyFollowings={handleNavigateToMyFollowings}
          onNavigateToEditProfile={handleNavigateToEditProfile}
          onNavigateToBuildResume={handleNavigateToBuildResume}
          onNavigateToMyApplications={handleNavigateToMyApplications}
          onNavigateToFavouriteJobs={handleNavigateToFavouriteJobs}
          onNavigateToCompanies={handleNavigateToCompanies}
          onNavigateToJobSearch={handleNavigateToJobSearch}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToMessages={handleNavigateToMessages}
        />
      );
    }

    if (currentScreen === 'my-followings') {
      return (
        <MyFollowings
          onMenuPress={handleMenuPress}
          messageUnreadCount={chatUnreadCount}
          onBack={handleBackToDashboard}
          onNavigateToJobDetail={handleNavigateToJobDetail}
          onNavigateToJobAlerts={handleNavigateToJobAlerts}
          onNavigateToMyFollowings={handleNavigateToMyFollowings}
          onNavigateToEditProfile={handleNavigateToEditProfile}
          onNavigateToBuildResume={handleNavigateToBuildResume}
          onNavigateToMyApplications={handleNavigateToMyApplications}
          onNavigateToFavouriteJobs={handleNavigateToFavouriteJobs}
          onNavigateToJobSearch={handleNavigateToJobSearch}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToMessages={handleNavigateToMessages}
          onNavigateToCompanies={handleNavigateToCompanies}
          onNavigateToPackages={handleNavigateToPackages}
          onNavigateToPaymentHistory={handleNavigateToPaymentHistory}
        />
      );
    }

    if (currentScreen === 'chat-conversation' && selectedChatConversation) {
      return (
        <ChatConversation
          conversation={selectedChatConversation}
          userType={userType === 'company' ? 'company' : 'seeker'}
          onBack={() => {
            setSelectedChatConversation(null);
            navigateBack();
          }}
        />
      );
    }

    if (currentScreen === 'messages') {
      return (
        <ChatConversationList
          userType={userType === 'company' ? 'company' : 'seeker'}
          onBack={handleBackToDashboard}
          onSelectConversation={(conv) => {
            setSelectedChatConversation(conv);
            navigateToScreen('chat-conversation');
          }}
          onConversationsLoaded={(_, totalUnread) => setChatUnreadCount(totalUnread)}
          onMenuItemPress={userType === 'company' ? handleCompanyMenuPress : handleMenuPress}
          onLogout={handleLogout}
          menuCompanyName={userType === 'company' ? companyProfile?.name : undefined}
          menuCompanyLogo={userType === 'company' ? companyProfile?.logo : undefined}
        />
      );
    }

    if (currentScreen === 'packages') {
      return (
        <Packages
          key={packagesRefreshKey}
          onMenuPress={handleMenuPress}
          onBack={handleBackToDashboard}
          onNavigateToJobDetail={handleNavigateToJobDetail}
          onNavigateToJobAlerts={handleNavigateToJobAlerts}
          onNavigateToMyFollowings={handleNavigateToMyFollowings}
          onNavigateToEditProfile={handleNavigateToEditProfile}
          onNavigateToBuildResume={handleNavigateToBuildResume}
          onNavigateToMyApplications={handleNavigateToMyApplications}
          onNavigateToFavouriteJobs={handleNavigateToFavouriteJobs}
          onNavigateToJobSearch={handleNavigateToJobSearch}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToMessages={handleNavigateToMessages}
          onNavigateToCompanies={handleNavigateToCompanies}
          onNavigateToPackages={handleNavigateToPackages}
          onNavigateToPaymentHistory={handleNavigateToPaymentHistory}
          onNavigateToPackagePurchase={handleNavigateToPackagePurchase}
          messageUnreadCount={chatUnreadCount}
        />
      );
    }

    if (currentScreen === 'package-purchase' && selectedPackageId != null) {
      return (
        <PackagePurchase
          packageId={selectedPackageId}
          onBack={() => {
            setSelectedPackageId(null);
            navigateToScreen('packages');
          }}
          onSuccess={() => {
            setPackagesRefreshKey((k) => k + 1);
          }}
        />
      );
    }

    if (currentScreen === 'payment-history') {
      return (
        <PaymentHistory
          onMenuPress={handleMenuPress}
          onBack={handleBackToDashboard}
          onNavigateToJobDetail={handleNavigateToJobDetail}
          onNavigateToJobAlerts={handleNavigateToJobAlerts}
          onNavigateToMyFollowings={handleNavigateToMyFollowings}
          onNavigateToEditProfile={handleNavigateToEditProfile}
          onNavigateToBuildResume={handleNavigateToBuildResume}
          onNavigateToMyApplications={handleNavigateToMyApplications}
          onNavigateToFavouriteJobs={handleNavigateToFavouriteJobs}
          onNavigateToJobSearch={handleNavigateToJobSearch}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToMessages={handleNavigateToMessages}
          onNavigateToCompanies={handleNavigateToCompanies}
          onNavigateToPackages={handleNavigateToPackages}
          onNavigateToPaymentHistory={handleNavigateToPaymentHistory}
          messageUnreadCount={chatUnreadCount}
        />
      );
    }

    if (currentScreen === 'email-to-friend' && selectedJob) {
      return (
        <EmailToFriend
          jobSlug={selectedJob.slug}
          jobTitle={selectedJob.title}
          companyName={selectedJob.company?.name}
          onBack={() => setCurrentScreen('job-detail')}
          onNavigateToThanks={() => setCurrentScreen('email-to-friend-thanks')}
        />
      );
    }

    if (currentScreen === 'email-to-friend-thanks') {
      return (
        <EmailToFriendThanks
          onBackToJobs={() => setCurrentScreen('job-list')}
          onBackToHome={() => setCurrentScreen('main')}
        />
      );
    }

    if (currentScreen === 'report-abuse' && selectedJob) {
      return (
        <ReportAbuse
          jobSlug={selectedJob.slug}
          jobTitle={selectedJob.title}
          companyName={selectedJob.company?.name}
          onBack={() => setCurrentScreen('job-detail')}
          onNavigateToThanks={() => setCurrentScreen('report-abuse-thanks')}
        />
      );
    }

    if (currentScreen === 'report-abuse-thanks') {
      return (
        <ReportAbuseThanks
          onBack={() => setCurrentScreen('job-detail')}
        />
      );
    }

    // Default fallback - show login
    return (
      <Login
        onLogin={handleLoginSubmit}
        onRegister={() => setCurrentScreen('register')}
        onBack={() => { }}
        onForgotPassword={handleForgotPassword}
      />
    );
  };

  return (
    <I18nextProvider i18n={i18n}>
      {renderScreen()}
    </I18nextProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gradientBackground: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
  },
});
