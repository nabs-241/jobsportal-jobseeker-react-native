# 📱 JobsPortal - Jobseeker React Native App

[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~54.0-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Envato-green.svg)](LICENSE.md)
[![Version](https://img.shields.io/badge/Version-1.0.0-success.svg)](CHANGELOG.md)

**A complete, production-ready React Native mobile application for job seekers and employers.**

Built with Expo, TypeScript, and modern React patterns. Includes full backend API integration with Laravel, 30+ screens, advanced job filtering, and comprehensive resume builder.

---

## 📚 Documentation

### 🚀 **[Open Complete Documentation →](../../../Sharjeel%20Data/Envato/Jobseeker%20App/Documentation/documentation.html)**

**Quick Links:**
- **[Quick Start Guide](../../../Sharjeel%20Data/Envato/Jobseeker%20App/Documentation/QUICK-START.html)** - Get running in 15 minutes
- **[Installation Guide](INSTALLATION.md)** - Detailed installation steps
- **[Configuration Guide](CONFIGURATION.md)** - API setup and customization
- **[Features List](FEATURES.md)** - All features explained
- **[API Documentation](API_DOCUMENTATION.md)** - API endpoints reference
- **[User Guide](USER_GUIDE.md)** - End-user instructions
- **[Changelog](CHANGELOG.md)** - Version history

---

---

## 🎯 Perfect For

- 🚀 **Startups** launching a job board platform
- 💼 **Businesses** needing recruitment solutions
- 👨‍💻 **Developers** building job portal projects
- 🎨 **Agencies** delivering client job portals
- 📈 **Entrepreneurs** starting HR tech ventures

---

## ✨ Key Highlights

### 🎨 **Modern, Professional UI**
- Beautiful gradient designs
- Material Design principles
- Smooth animations
- Responsive layouts
- Platform-specific UI (iOS/Android)

### 💪 **Feature-Rich**
- 30+ screens included
- Advanced job search with 10 filter categories
- Complete resume builder (7 sections)
- Real-time job alerts
- Company following system
- Application tracking

### 🛠 **Developer-Friendly**
- 100% TypeScript
- Clean, documented code
- Modular architecture
- Reusable components
- Easy to customize

### 🔌 **Backend Ready**
- Full Laravel API integration
- 100+ API endpoints
- Token-based authentication
- Master data management
- File upload handling

---

## 📦 What's Included

### 📱 Mobile Application
- Complete React Native app source code
- All UI components and screens
- API service layer
- Navigation system
- State management
- TypeScript configurations

### 📚 Documentation
- Installation Guide
- Configuration Guide
- User Guide
- API Documentation
- Features List
- Troubleshooting Guides
- Changelog

### 🎨 Assets
- App icons (Android & iOS)
- Splash screens
- Placeholder images
- UI icons
- Sample images

### 🔧 Tools & Scripts
- Build scripts (Windows .bat files)
- EAS Build configuration
- Cache clearing script
- Development tools

---

## 🌟 Core Features

### For Job Seekers

#### 🔐 Authentication
- Email & password registration
- Email verification with OTP
- Secure login system
- Password reset functionality
- Auto-login (remember me)
- Token-based security

#### 📊 Dashboard
- Profile completion tracking
- Profile views counter
- Applied jobs statistics
- Favorite jobs count
- Messages overview
- Matching job recommendations
- Quick action cards

#### 👤 Profile Management
- **Personal Details**: Name, email, phone, date of birth (calendar picker)
- **Location**: Country, state, city (cascading dropdowns)
- **Professional Info**: Experience, career level, industry
- **Salary Expectations**: Current and expected salary
- **Photos**: Profile picture and cover image upload
- **Video Profile**: YouTube/Vimeo integration
- **Required Field Indicators**: Red asterisks for mandatory fields

#### 📝 Resume Builder (7 Sections)
1. **Summary/Bio** - Professional overview
2. **Work Experience** - Employment history with CRUD operations
3. **Education** - Academic qualifications
4. **Skills** - Technical and soft skills with proficiency
5. **Languages** - Language proficiency levels
6. **Projects** - Portfolio showcase
7. **CV Upload** - Multiple PDF resume support

#### 🔍 Advanced Job Search
- **Smart Search**: Keyword-based search
- **10 Filter Categories**:
  1. Jobs By Experience (with counts)
  2. Job Type (Full-time, Part-time, etc.)
  3. Job Shift (Day, Night, Rotating)
  4. Career Level (Entry to Executive)
  5. Degree Level (High School to PhD)
  6. Jobs By Industry
  7. Jobs By Country
  8. Jobs By State (dynamic loading)
  9. Jobs By City (dynamic loading)
  10. Salary Range (min/max)

- **Smart Filtering**: Only shows options with active jobs
- **Job Counts**: Displays number of jobs per filter
- **Cascade Filtering**: Location filters load dynamically
- **Active Filter Badge**: Shows count of active filters
- **Featured Jobs**: Special section for premium listings

#### 📬 Job Applications
- One-click apply
- Resume selection
- Cover letter input
- Application tracking
- Status updates
- Application history

#### ❤️ Favorite Jobs
- Save jobs for later
- Quick access
- One-click apply
- Manage saved jobs

#### 🔔 Job Alerts
- Custom search criteria
- Email notifications
- Alert frequency settings
- Manage multiple alerts

#### 🏢 Company Following
- Follow favorite companies
- New job notifications
- Company updates
- View company profiles

#### 💬 Messaging
- Company communications
- Reply to messages
- Message history

### For Companies/Employers

#### 🏢 Company Dashboard
- Posted jobs statistics
- Applications received count
- Profile views analytics
- Quick action cards

#### 📝 Job Posting
- Create job postings
- Complete job descriptions
- Set requirements
- Configure salary ranges
- Set application deadlines
- Edit/delete jobs
- Active/inactive toggle

#### 👥 Application Management
- View all applications
- Filter by job
- Applicant profiles
- Shortlist candidates
- Reject applications
- Mark as hired
- Favorite applicants
- Bulk actions

#### 🔍 Candidate Search
- Search job seekers
- Filter by skills
- Filter by experience
- View full profiles
- Download resumes
- Contact candidates

#### 📧 Messaging System
- Send messages to candidates
- Reply to inquiries
- Communication history

---

## 🛠 Technical Specifications

### Built With
- **Framework**: React Native 0.81.4
- **Platform**: Expo ~54.0.10
- **Language**: TypeScript 5.8.3
- **State Management**: React Hooks
- **Storage**: AsyncStorage
- **Icons**: @expo/vector-icons
- **Gradients**: expo-linear-gradient
- **Image Picker**: expo-image-picker
- **Date Picker**: @react-native-community/datetimepicker
- **Authentication**: expo-local-authentication

### Architecture
- **Service Layer Pattern**: Separated API logic
- **Component-Based**: Reusable UI components
- **TypeScript**: Full type safety
- **Centralized Navigation**: Single navigation handler
- **Configuration Management**: Centralized config files

### Performance
- Image lazy loading
- Efficient list rendering
- Pagination support
- Optimized re-renders
- Memory management
- Caching strategies

---

## 📋 Requirements

### Development
- Node.js 18.x or higher
- npm 9.x or higher
- Expo CLI
- Git

### Production
- EAS CLI (for building APK)
- Expo account
- Laravel backend (included separately)

### Devices
- **Android**: 6.0 (API 23) or higher
- **iOS**: iOS 13.4 or higher

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd jobsportalapp
npm install
```

### 2. Configure API
Edit `config/api.ts`:
```typescript
BASE_URL: 'https://your-domain.com/api'
```

### 3. Run Development Server
```bash
npm start
```

### 4. Test on Device
- Scan QR code with Expo Go app
- OR press 'a' for Android emulator
- OR press 'i' for iOS simulator

### 5. Build APK
```bash
eas build -p android --profile preview
```

**Detailed instructions available in [INSTALLATION.md](INSTALLATION.md)**

---

## 📁 Project Structure

```
jobsportalapp/
├── assets/                 # Images, icons, and media files
├── config/                 # Configuration files
│   ├── api.ts             # API endpoints and settings ⚙️
│   ├── navigation.ts      # Navigation configuration
│   └── development.ts     # Development settings
├── services/               # API service layer
│   ├── apiService.ts      # Base HTTP service
│   ├── authService.ts     # Authentication service
│   ├── jobsService.ts     # Jobs service
│   ├── userService.ts     # User profile service
│   └── dashboardService.ts # Dashboard service
├── templates/              # UI Components & Screens
│   ├── auth/              # Authentication screens (7 screens)
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── EmailVerification.tsx
│   │   ├── ForgotPassword.tsx
│   │   ├── ResetPassword.tsx
│   │   ├── ResetPasswordCode.tsx
│   │   └── VerificationSuccess.tsx
│   ├── jobseeker/         # Job seeker screens (10+ screens)
│   │   ├── Dashboard.tsx
│   │   ├── Home.tsx
│   │   ├── EditProfile.tsx
│   │   ├── BuildResume.tsx
│   │   ├── MyApplications.tsx
│   │   ├── FavouriteJobs.tsx
│   │   ├── JobAlerts.tsx
│   │   ├── MyFollowings.tsx
│   │   ├── Messages.tsx
│   │   └── resume-sections/
│   │       ├── CVSection.tsx
│   │       ├── ExperienceSection.tsx
│   │       ├── EducationSection.tsx
│   │       ├── SkillsSection.tsx
│   │       ├── LanguagesSection.tsx
│   │       ├── ProjectsSection.tsx
│   │       └── SummarySection.tsx
│   ├── jobs/              # Job-related screens
│   │   ├── JobList.tsx
│   │   ├── JobDetail.tsx
│   │   └── ApplyJob.tsx
│   ├── companies/         # Company screens
│   │   ├── CompaniesList.tsx
│   │   └── CompanyDetail.tsx
│   ├── categories/        # Category screens
│   │   └── CategoriesList.tsx
│   ├── forms/             # Form components
│   │   ├── EmailToFriend.tsx
│   │   ├── ReportAbuse.tsx
│   │   └── index.ts
│   ├── Header.tsx         # App header
│   ├── Navigation.tsx     # Bottom navigation
│   ├── Sidebar.tsx        # Sidebar menu
│   ├── Intro.tsx          # Welcome screen
│   └── Loading.tsx        # Loading screen
├── utils/                  # Utility functions
│   ├── navigationHandler.ts
│   └── userHelper.ts
├── docs/                   # Additional documentation
├── App.tsx                 # Main app component
├── index.ts                # App entry point
├── app.json                # Expo configuration
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── eas.json                # EAS Build config
└── metro.config.js         # Metro bundler config
```

---

## 🎨 Customization

### Branding
- Update app name in `app.json`
- Replace icons in `assets/`
- Change color scheme in components
- Update logo images
- Customize splash screen

### Configuration
- API endpoints in `config/api.ts`
- Navigation items in `config/navigation.ts`
- Build settings in `eas.json`

**See [CONFIGURATION.md](CONFIGURATION.md) for detailed guide**

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [INSTALLATION.md](INSTALLATION.md) | Complete installation instructions |
| [CONFIGURATION.md](CONFIGURATION.md) | Configuration and customization guide |
| [FEATURES.md](FEATURES.md) | Complete list of all features |
| [USER_GUIDE.md](USER_GUIDE.md) | End-user guide for app usage |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | API endpoints and integration |
| [CHANGELOG.md](CHANGELOG.md) | Version history and updates |
| [LICENSE.md](LICENSE.md) | License terms and conditions |
| [TROUBLESHOOTING_API_ERRORS.md](TROUBLESHOOTING_API_ERRORS.md) | Common issues and solutions |

---

## 🔥 Latest Features (v1.0.0)

### ✨ Job Search Enhancements
- ✅ 10-category advanced filter system
- ✅ Smart filtering (only shows options with jobs)
- ✅ Job counts displayed on each filter
- ✅ Cascade location filtering (Country → State → City)
- ✅ Featured jobs section
- ✅ Active filter badge indicator

### 📅 Profile Improvements
- ✅ Calendar date picker for date of birth
- ✅ Red asterisks for required fields
- ✅ Image upload with validation
- ✅ Real-time upload progress
- ✅ Success screen with navigation

### 🏗 Architecture Updates
- ✅ Centralized navigation system
- ✅ Improved API service layer
- ✅ Better error handling
- ✅ TypeScript strict mode
- ✅ Component optimization

---

## 📊 Statistics

- **Total Screens**: 30+
- **Total Components**: 50+
- **Lines of Code**: 15,000+
- **API Endpoints**: 100+
- **Master Data Types**: 15+
- **Resume Sections**: 7 types
- **Filter Categories**: 10
- **Documentation Pages**: 8

---

## 🎯 Use Cases

### Perfect for:
- Job Board Platforms
- Recruitment Agencies
- Corporate HR Solutions
- Freelance Marketplaces
- Talent Acquisition Platforms
- Career Portals
- Industry-Specific Job Boards

---

## 🚀 Getting Started

### Quick Start (3 Minutes)

```bash
# 1. Clone/Extract the project
cd jobsportalapp

# 2. Install dependencies
npm install

# 3. Update API URL in config/api.ts
BASE_URL: 'https://your-domain.com/api'

# 4. Start development server
npm start

# 5. Scan QR code with Expo Go app
```

### Building APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build APK
eas build -p android --profile preview
```

**Detailed guide:** [INSTALLATION.md](INSTALLATION.md)

---

## 🎨 Screenshots & Demo

### Job Seeker Screens
- Login & Registration
- Dashboard
- Job Search with Filters
- Job Details
- Apply Job
- Edit Profile (with date picker & red asterisks)
- Resume Builder
- My Applications
- Favorite Jobs

### Company Screens
- Company Dashboard
- Post Job
- Manage Applications
- Candidate Profiles
- Company Profile

---

## 💡 Key Features Breakdown

### Authentication System
- ✅ Dual user types (Seeker & Company)
- ✅ Email verification with OTP
- ✅ Password recovery with codes
- ✅ Secure token management
- ✅ Auto-login capability

### Job Discovery
- ✅ Smart search algorithm
- ✅ 10 advanced filters
- ✅ Category browsing
- ✅ Featured jobs section
- ✅ Job recommendations
- ✅ Filter with job counts

### Application Management
- ✅ Easy apply process
- ✅ Resume selection
- ✅ Cover letter support
- ✅ Application tracking
- ✅ Status notifications
- ✅ Application history

### Resume Builder
- ✅ 7 resume sections
- ✅ PDF upload support
- ✅ Multiple CV management
- ✅ Default CV selection
- ✅ CRUD operations
- ✅ Professional formatting

### Company Features
- ✅ Job posting system
- ✅ Application management
- ✅ Candidate search
- ✅ Profile management
- ✅ Analytics dashboard
- ✅ Messaging system

**See complete list: [FEATURES.md](FEATURES.md)**

---

## 🛠 Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81.4 | Mobile framework |
| Expo | ~54.0.10 | Development platform |
| TypeScript | ~5.8.3 | Type safety |
| React | 19.1.0 | UI library |

### Libraries
| Library | Purpose |
|---------|---------|
| @expo/vector-icons | Icon system |
| expo-image-picker | Image uploads |
| expo-linear-gradient | Gradient backgrounds |
| @react-native-async-storage | Data persistence |
| @react-native-community/datetimepicker | Date selection |
| expo-local-authentication | Biometric auth |

### Backend (Included Separately)
- Laravel 8.x
- MySQL/MariaDB
- PHP 7.4+

---

## 📱 Platform Support

### Android
- Minimum SDK: API 23 (Android 6.0)
- Target SDK: API 34
- Build Type: APK or AAB
- Google Play Ready

### iOS
- Minimum: iOS 13.4
- Universal Binary (iPhone & iPad)
- App Store Ready

### Both Platforms
- Shared codebase (95%+)
- Platform-specific optimizations
- Native performance

---

## 🎯 CodeCanyon Quality Standards

### ✅ Code Quality
- Clean, readable code
- Comprehensive comments
- TypeScript for type safety
- No hardcoded credentials
- Modular structure
- Reusable components
- Best practices followed

### ✅ Documentation
- Complete installation guide
- Configuration instructions
- API documentation
- User guide
- Features list
- Troubleshooting guide
- Changelog

### ✅ Professional Package
- Well-organized structure
- All assets included
- Build scripts provided
- Example configurations
- Demo credentials ready

---

## 🔧 Configuration

### Essential Configuration Steps

1. **Update API URL** (`config/api.ts`):
```typescript
BASE_URL: 'https://your-domain.com/api',
ASSET_URL: 'https://your-domain.com',
```

2. **Update App Identity** (`app.json`):
```json
{
  "name": "Your App Name",
  "android": {
    "package": "com.yourcompany.appname"
  }
}
```

3. **Replace Assets**:
- `assets/icon.png` - App icon (1024x1024)
- `assets/splash-icon.png` - Splash screen
- `assets/jobportal-logo.png` - App logo

4. **Build**:
```bash
eas build -p android --profile production
```

**Full guide:** [CONFIGURATION.md](CONFIGURATION.md)

---

## 📚 Learning Resources

### For Developers

**New to React Native?**
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

**Need Help?**
- Check documentation files
- Review code comments
- Use included debugger
- Test with Postman

---

## 🔄 Updates & Support

### What's Included
- ✅ **6 Months Support**: Bug fixes, installation help, configuration assistance
- ✅ **Lifetime Updates**: Feature enhancements, security patches, compatibility updates
- ✅ **Documentation**: Comprehensive guides and examples
- ✅ **Regular Updates**: New features and improvements

### Future Updates (Roadmap)
- Push notifications
- Real-time chat
- Dark mode theme
- Multi-language support
- Social media login
- Advanced analytics
- Interview scheduling
- Skill assessments

---

## 🎁 Bonus Included

- ✅ **Build Scripts**: Windows .bat files for easy building
- ✅ **Debug Tools**: API debugger component
- ✅ **Clear Cache Script**: Easy cache management
- ✅ **Sample Images**: All placeholder images
- ✅ **Troubleshooting Guides**: Common issues and solutions
- ✅ **Integration Guides**: Step-by-step API integration

---

## 📝 License

This item is licensed under the **Envato Regular License**.

### You CAN:
- ✅ Use for one client project
- ✅ Use for your own business
- ✅ Modify and customize
- ✅ Create derivative works

### You CANNOT:
- ❌ Resell or redistribute source code
- ❌ Use in multiple projects (requires multiple licenses)
- ❌ Use in SaaS without Extended License

**Full license terms:** [LICENSE.md](LICENSE.md)

---

## 🆘 Support

### Documentation
All questions answered in documentation files:
- Installation issues → [INSTALLATION.md](INSTALLATION.md)
- Configuration questions → [CONFIGURATION.md](CONFIGURATION.md)
- API problems → [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- Usage questions → [USER_GUIDE.md](USER_GUIDE.md)

### Support Channels
- 📧 **Email Support**: Included for 6 months
- 📖 **Documentation**: Comprehensive guides
- 🐛 **Bug Fixes**: Regular updates
- 💬 **Comments**: CodeCanyon item comments

---

## ✅ Production Ready

### Quality Checklist
- ✅ All features fully functional
- ✅ Complete API integration
- ✅ Error handling implemented
- ✅ Input validation
- ✅ Loading states
- ✅ Success/error messages
- ✅ Responsive design
- ✅ Cross-platform tested
- ✅ Performance optimized
- ✅ Security implemented
- ✅ Well documented
- ✅ Clean code
- ✅ TypeScript strict mode
- ✅ No console errors
- ✅ Professional UI/UX

---

## 🎓 What You'll Learn

By studying this codebase:
- React Native best practices
- TypeScript patterns
- Service layer architecture
- API integration
- State management
- Navigation systems
- Form handling
- Image uploads
- Authentication flows
- Error handling

---

## 🏆 Why Choose This App?

### Complete Solution
- ✅ Everything needed for a job portal
- ✅ Both job seeker and employer sides
- ✅ Full backend integration
- ✅ Production-ready code

### Professional Quality
- ✅ Clean, maintainable code
- ✅ TypeScript for reliability
- ✅ Comprehensive documentation
- ✅ Regular updates

### Easy to Use
- ✅ Simple configuration
- ✅ Clear documentation
- ✅ Well-structured code
- ✅ Ready-to-deploy

### Great Value
- ✅ 30+ screens included
- ✅ 50+ components
- ✅ Complete backend integration
- ✅ Ongoing support

---

## 📊 Comparison

| Feature | This App | Basic Templates |
|---------|----------|-----------------|
| TypeScript | ✅ 100% | ❌ Partial or None |
| Documentation | ✅ Comprehensive | ⚠️ Basic |
| API Integration | ✅ Complete | ⚠️ Mock data |
| Resume Builder | ✅ 7 sections | ❌ None |
| Advanced Filters | ✅ 10 categories | ⚠️ Basic |
| User Types | ✅ Seeker & Company | ⚠️ Single type |
| Backend | ✅ Full Laravel API | ❌ Not included |
| Support | ✅ 6 months | ⚠️ Limited |
| Updates | ✅ Lifetime | ⚠️ Limited |

---

## 🤝 Support & Feedback

### We Value Your Feedback!
- ⭐ Rate on CodeCanyon
- 💬 Leave a review
- 📧 Request features
- 🐛 Report bugs

### Stay Updated
- Watch for updates on CodeCanyon
- Check changelog regularly
- Join our community (if available)

---

## 📞 Contact

- **Item Support**: Through CodeCanyon
- **Pre-Sale Questions**: CodeCanyon comments
- **Custom Development**: Available upon request

---

## 🎉 Thank You!

Thank you for purchasing Jobs Portal App! We're committed to providing you with the best product and support.

**Questions?** Check the documentation files above.  
**Issues?** Review [TROUBLESHOOTING_API_ERRORS.md](TROUBLESHOOTING_API_ERRORS.md)  
**Ready to start?** See [INSTALLATION.md](INSTALLATION.md)  

---

## 📌 Important Links

- **Documentation**: See all .md files in project root
- **Support**: CodeCanyon item page
- **Updates**: Check CodeCanyon regularly
- **Backend Setup**: See Laravel installation guide (included separately)

---

## ⚡ Quick Links

| What | Where |
|------|-------|
| Installation | [INSTALLATION.md](INSTALLATION.md) |
| Configuration | [CONFIGURATION.md](CONFIGURATION.md) |
| Features | [FEATURES.md](FEATURES.md) |
| User Guide | [USER_GUIDE.md](USER_GUIDE.md) |
| API Docs | [API_DOCUMENTATION.md](API_DOCUMENTATION.md) |
| Updates | [CHANGELOG.md](CHANGELOG.md) |
| License | [LICENSE.md](LICENSE.md) |

---

**Version**: 1.0.0  
**Last Updated**: October 11, 2025  
**License**: Envato Regular License  
**Built with**: ❤️ React Native + Expo + TypeScript

---

**Happy Coding! 🚀**

*A complete, professional job portal solution ready for deployment.*
