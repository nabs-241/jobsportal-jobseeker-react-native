import apiService, { ApiResponse } from './apiService';
import { getAuthToken } from './authStorage';
import { getUserId } from '../utils/userHelper';
import { buildApiUrl } from '../config/api';

// Interface for CV completeness check result
export interface CVCompletenessResult {
  isComplete: boolean;
  missingSections: string[];
  completedSections: string[];
  totalSections: number;
  completedCount: number;
  percentage: number;
}

// Interface for individual section data
interface SectionData {
  hasData: boolean;
  count: number;
}

/**
 * CV Completeness Service
 * 
 * This service checks if a user's CV is complete by verifying that all required sections
 * have data. It matches the web version logic from home.blade.php which checks:
 * - Projects (getProfileProjectsArray)
 * - CVs (getProfileCvsArray) 
 * - Experience (profileExperience)
 * - Education (profileEducation)
 * - Skills (profileSkills)
 */
class CVCompletenessService {
  /**
   * Check if CV is complete by fetching data from each section
   */
  async checkCVCompleteness(): Promise<ApiResponse<CVCompletenessResult>> {
    try {
      const token = await getAuthToken();
      const userId = await getUserId();
      
      if (!token || !userId) {
        return {
          success: false,
          error: 'No authentication token or user ID found',
          statusCode: 401,
        };
      }

      const userIdString = userId.toString();

      // Check all required sections in parallel
      const [
        summaryResult,
        projectsResult,
        cvsResult,
        experienceResult,
        educationResult,
        skillsResult,
        languagesResult
      ] = await Promise.all([
        this.checkSummarySection(userIdString, token),
        this.checkProjectsSection(userIdString, token),
        this.checkCVsSection(userIdString, token),
        this.checkExperienceSection(userIdString, token),
        this.checkEducationSection(userIdString, token),
        this.checkSkillsSection(userIdString, token),
        this.checkLanguagesSection(userIdString, token)
      ]);

      const sections = {
        summary: summaryResult,
        projects: projectsResult,
        cvs: cvsResult,
        experience: experienceResult,
        education: educationResult,
        skills: skillsResult,
        languages: languagesResult
      };


      // Determine which sections are complete
      const completedSections: string[] = [];
      const missingSections: string[] = [];
      
      Object.entries(sections).forEach(([sectionName, sectionData]) => {
        if (sectionData.hasData && sectionData.count > 0) {
          completedSections.push(sectionName);
        } else {
          missingSections.push(sectionName);
        }
      });

      const totalSections = Object.keys(sections).length;
      const completedCount = completedSections.length;
      const percentage = Math.round((completedCount / totalSections) * 100);
      const isComplete = missingSections.length === 0;

      const result: CVCompletenessResult = {
        isComplete,
        missingSections,
        completedSections,
        totalSections,
        completedCount,
        percentage
      };


      return {
        success: true,
        data: result,
        statusCode: 200,
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to check CV completeness',
        statusCode: 0,
      };
    }
  }

  /**
   * Check if summary section has data
   */
  private async checkSummarySection(userId: string, token: string): Promise<SectionData> {
    try {
      const response = await apiService.post(`/show-front-profile-summary/${userId}`, {}, token);
      const summary = ((response.data as any)?.summary || '').toString().trim();
      // Match web logic: summary should be meaningful
      const hasSummary = summary.length >= 10;
      return {
        hasData: hasSummary,
        count: hasSummary ? 1 : 0
      };
    } catch (error) {
      return { hasData: false, count: 0 };
    }
  }

  /**
   * Check if projects section has data
   */
  private async checkProjectsSection(userId: string, token: string): Promise<SectionData> {
    try {
      const response = await apiService.post(`/show-front-profile-projects/${userId}`, {}, token);
      const projects = response.data || [];
      return {
        hasData: Array.isArray(projects) && projects.length > 0,
        count: Array.isArray(projects) ? projects.length : 0
      };
    } catch (error) {
      return { hasData: false, count: 0 };
    }
  }

  /**
   * Check if CVs section has data
   */
  private async checkCVsSection(userId: string, token: string): Promise<SectionData> {
    try {
      const response = await apiService.post(`/show-front-profile-cvs/${userId}`, {}, token);
      const cvs = response.data || [];
      return {
        hasData: Array.isArray(cvs) && cvs.length > 0,
        count: Array.isArray(cvs) ? cvs.length : 0
      };
    } catch (error) {
      return { hasData: false, count: 0 };
    }
  }

  /**
   * Check if experience section has data
   */
  private async checkExperienceSection(userId: string, token: string): Promise<SectionData> {
    try {
      const response = await apiService.post(`/show-front-profile-experience/${userId}`, {}, token);
      const experience = response.data || [];
      return {
        hasData: Array.isArray(experience) && experience.length > 0,
        count: Array.isArray(experience) ? experience.length : 0
      };
    } catch (error) {
      return { hasData: false, count: 0 };
    }
  }

  /**
   * Check if education section has data
   */
  private async checkEducationSection(userId: string, token: string): Promise<SectionData> {
    try {
      const response = await apiService.post(`/show-front-profile-education/${userId}`, {}, token);
      const education = response.data || [];
      return {
        hasData: Array.isArray(education) && education.length > 0,
        count: Array.isArray(education) ? education.length : 0
      };
    } catch (error) {
      return { hasData: false, count: 0 };
    }
  }

  /**
   * Check if skills section has data
   */
  private async checkSkillsSection(userId: string, token: string): Promise<SectionData> {
    try {
      const response = await apiService.post(`/show-front-profile-skills/${userId}`, {}, token);
      const skills = response.data || [];
      return {
        hasData: Array.isArray(skills) && skills.length > 0,
        count: Array.isArray(skills) ? skills.length : 0
      };
    } catch (error) {
      return { hasData: false, count: 0 };
    }
  }

  /**
   * Check if languages section has data
   */
  private async checkLanguagesSection(userId: string, token: string): Promise<SectionData> {
    try {
      const response = await apiService.post(`/show-front-profile-languages/${userId}`, {}, token);
      const languages = response.data || [];
      return {
        hasData: Array.isArray(languages) && languages.length > 0,
        count: Array.isArray(languages) ? languages.length : 0
      };
    } catch (error) {
      return { hasData: false, count: 0 };
    }
  }

  /**
   * Get a user-friendly message about missing sections
   */
  getMissingSectionsMessage(missingSections: string[]): string {
    if (missingSections.length === 0) {
      return 'Your CV is complete!';
    }

    const sectionNames = {
      summary: 'Summary',
      projects: 'Projects',
      cvs: 'CVs',
      experience: 'Experience',
      education: 'Education',
      skills: 'Skills',
      languages: 'Languages'
    };

    const missingNames = missingSections.map(section => sectionNames[section as keyof typeof sectionNames] || section);
    
    if (missingNames.length === 1) {
      return `Your CV is missing: ${missingNames[0]}`;
    } else if (missingNames.length === 2) {
      return `Your CV is missing: ${missingNames.join(' and ')}`;
    } else {
      const lastSection = missingNames.pop();
      return `Your CV is missing: ${missingNames.join(', ')}, and ${lastSection}`;
    }
  }
}

// Create and export singleton instance
const cvCompletenessService = new CVCompletenessService();
export default cvCompletenessService;

// Export commonly used methods for convenience
export const {
  checkCVCompleteness,
  getMissingSectionsMessage
} = cvCompletenessService;
