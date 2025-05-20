// src/components/StyleQuiz/utils/StyleQuizResultsProcessor.ts

import { StyleQuizAnswer, StyleQuizQuestion, UserPreferences, StylePreference, ColorPreference, SizePreference } from '../../../types/user';

/**
 * Processes style quiz answers and generates a complete user style profile
 */
export class StyleQuizResultsProcessor {
  private answers: StyleQuizAnswer[];
  private questions: StyleQuizQuestion[];
  
  constructor(answers: StyleQuizAnswer[], questions: StyleQuizQuestion[]) {
    this.answers = answers;
    this.questions = questions;
  }
  
  /**
   * Get answer for a specific question
   */
  private getAnswerForQuestion(questionId: string): StyleQuizAnswer | undefined {
    return this.answers.find(a => a.questionId === questionId);
  }
  
  /**
   * Get question by ID
   */
  private getQuestion(questionId: string): StyleQuizQuestion | undefined {
    return this.questions.find(q => q.id === questionId);
  }
  
  /**
   * Get option text for a given answer
   */
  private getOptionText(questionId: string, optionId: string): string {
    const question = this.getQuestion(questionId);
    if (!question || !question.options) return '';
    
    const option = question.options.find(o => o.id === optionId);
    return option?.text || '';
  }
  
  /**
   * Get option value for a given answer
   */
  private getOptionValue(questionId: string, optionId: string): string | number {
    const question = this.getQuestion(questionId);
    if (!question || !question.options) return '';
    
    const option = question.options.find(o => o.id === optionId);
    return option?.value || '';
  }
  
  /**
   * Process all style preferences (from question 2)
   */
  private getStylePreferences(): StylePreference[] {
    const styleAnswer = this.getAnswerForQuestion('q2');
    if (!styleAnswer || !styleAnswer.answerId) return [];
    
    // Primary style (main selection)
    const primaryStyle = {
      style: String(this.getOptionValue('q2', styleAnswer.answerId)),
      weight: 1.0
    };
    
    // For now, we only have the primary style
    // Future enhancement: derive secondary styles based on other answers
    return [primaryStyle];
  }
  
  /**
   * Process all color preferences (from question 6)
   */
  private getColorPreferences(): ColorPreference[] {
    const colorAnswer = this.getAnswerForQuestion('q6');
    if (!colorAnswer || !colorAnswer.answerId) return [];
    
    // Primary color palette
    const primaryColor = {
      color: String(this.getOptionValue('q6', colorAnswer.answerId)),
      weight: 1.0
    };
    
    return [primaryColor];
  }
  
  /**
   * Process all size preferences from various size questions
   */
  private getSizePreferences(): SizePreference[] {
    const preferences: SizePreference[] = [];
    
    // Top size (q3)
    const topSizeAnswer = this.getAnswerForQuestion('q3');
    if (topSizeAnswer && topSizeAnswer.answerId) {
      preferences.push({
        category: 'tops',
        size: String(this.getOptionValue('q3', topSizeAnswer.answerId))
      });
    }
    
    // Bottom size (q4)
    const bottomSizeAnswer = this.getAnswerForQuestion('q4');
    if (bottomSizeAnswer && bottomSizeAnswer.answerId) {
      preferences.push({
        category: 'bottoms',
        size: String(this.getOptionValue('q4', bottomSizeAnswer.answerId))
      });
    }
    
    // Shoe size (q5)
    const shoeSizeAnswer = this.getAnswerForQuestion('q5');
    if (shoeSizeAnswer && shoeSizeAnswer.answerId) {
      preferences.push({
        category: 'shoes',
        size: String(this.getOptionValue('q5', shoeSizeAnswer.answerId))
      });
    }
    
    return preferences;
  }
  
  /**
   * Get occasions user is interested in (from question 11)
   */
  private getOccasionPreferences(): string[] {
    const occasionAnswer = this.getAnswerForQuestion('q11');
    if (!occasionAnswer || !occasionAnswer.answerIds) return [];
    
    // Extract values for selected occasions
    return occasionAnswer.answerIds.map(id => 
      String(this.getOptionValue('q11', id))
    );
  }
  
  /**
   * Get favorite brands from brand questions (18, 19, 20)
   */
  private getFavoriteBrands(): string[] {
    const brands: string[] = [];
    
    // Casual brands (q18)
    const casualBrandsAnswer = this.getAnswerForQuestion('q18');
    if (casualBrandsAnswer && casualBrandsAnswer.answerIds) {
      casualBrandsAnswer.answerIds.forEach(id => {
        if (id !== 'other_casual') {
          brands.push(String(this.getOptionValue('q18', id)));
        }
      });
    }
    
    // Athletic brands (q19)
    const athleticBrandsAnswer = this.getAnswerForQuestion('q19');
    if (athleticBrandsAnswer && athleticBrandsAnswer.answerIds) {
      athleticBrandsAnswer.answerIds.forEach(id => {
        if (id !== 'other_athletic') {
          brands.push(String(this.getOptionValue('q19', id)));
        }
      });
    }
    
    // Luxury brands (q20)
    const luxuryBrandsAnswer = this.getAnswerForQuestion('q20');
    if (luxuryBrandsAnswer && luxuryBrandsAnswer.answerIds) {
      luxuryBrandsAnswer.answerIds.forEach(id => {
        if (id !== 'none' && id !== 'other_luxury') {
          brands.push(String(this.getOptionValue('q20', id)));
        }
      });
    }
    
    // Remove duplicates
    return [...new Set(brands)];
  }
  
  /**
   * Get price range from budget slider (q16)
   */
  private getPriceRange(): { min?: number, max?: number, target?: number } {
    const budgetAnswer = this.getAnswerForQuestion('q16');
    if (!budgetAnswer || budgetAnswer.answerValue === undefined) {
      return {};
    }
    
    const target = budgetAnswer.answerValue;
    
    // Create a range around the target value (±25%)
    return {
      min: Math.max(0, Math.floor(target * 0.75)),
      max: Math.ceil(target * 1.25),
      target
    };
  }
  
  /**
   * Get preferred patterns (q7)
   */
  private getPatternPreferences(): string[] {
    const patternAnswer = this.getAnswerForQuestion('q7');
    if (!patternAnswer || !patternAnswer.answerIds) return [];
    
    return patternAnswer.answerIds.map(id => 
      String(this.getOptionValue('q7', id))
    );
  }
  
  /**
   * Get preferred fabrics (q10)
   */
  private getFabricPreferences(): string[] {
    const fabricAnswer = this.getAnswerForQuestion('q10');
    if (!fabricAnswer || !fabricAnswer.answerIds) return [];
    
    return fabricAnswer.answerIds.map(id => 
      String(this.getOptionValue('q10', id))
    );
  }
  
  /**
   * Get fit preferences (q8 and q9)
   */
  private getFitPreferences(): Record<string, string> {
    const fitPreferences: Record<string, string> = {};
    
    // Top fit (q8)
    const topFitAnswer = this.getAnswerForQuestion('q8');
    if (topFitAnswer && topFitAnswer.answerId) {
      fitPreferences.topFit = String(this.getOptionValue('q8', topFitAnswer.answerId));
    }
    
    // Bottom fit (q9)
    const bottomFitAnswer = this.getAnswerForQuestion('q9');
    if (bottomFitAnswer && bottomFitAnswer.answerId) {
      fitPreferences.bottomFit = String(this.getOptionValue('q9', bottomFitAnswer.answerId));
    }
    
    return fitPreferences;
  }
  
  /**
   * Get preferred celebrities (q21 and q22)
   */
  private getCelebrityPreferences(): string[] {
    const celebrities: string[] = [];
    
    // Modern celebrities (q21)
    const modernCelebrityAnswer = this.getAnswerForQuestion('q21');
    if (modernCelebrityAnswer && modernCelebrityAnswer.answerId) {
      celebrities.push(String(this.getOptionValue('q21', modernCelebrityAnswer.answerId)));
    }
    
    // Classic celebrities (q22)
    const classicCelebrityAnswer = this.getAnswerForQuestion('q22');
    if (classicCelebrityAnswer && classicCelebrityAnswer.answerId) {
      celebrities.push(String(this.getOptionValue('q22', classicCelebrityAnswer.answerId)));
    }
    
    return celebrities;
  }
  
  /**
   * Get trend approach (q23)
   */
  private getTrendApproach(): string | null {
    const trendAnswer = this.getAnswerForQuestion('q23');
    if (!trendAnswer || !trendAnswer.answerId) return null;
    
    return String(this.getOptionValue('q23', trendAnswer.answerId));
  }
  
  /**
   * Get comfort vs style preference (q24)
   */
  private getComfortStyleBalance(): number | null {
    const comfortStyleAnswer = this.getAnswerForQuestion('q24');
    if (!comfortStyleAnswer || comfortStyleAnswer.answerValue === undefined) return null;
    
    // Returns 0-100 where 0 is maximum comfort and 100 is maximum style
    return comfortStyleAnswer.answerValue;
  }
  
  /**
   * Get main style goal (q25)
   */
  private getStyleGoal(): string | null {
    const goalAnswer = this.getAnswerForQuestion('q25');
    if (!goalAnswer || !goalAnswer.answerId) return null;
    
    return String(this.getOptionValue('q25', goalAnswer.answerId));
  }
  
  /**
   * Get lifestyle attributes (q12 and q13)
   */
  private getLifestyleAttributes(): Record<string, string> {
    const lifestyle: Record<string, string> = {};
    
    // Work environment (q12)
    const workAnswer = this.getAnswerForQuestion('q12');
    if (workAnswer && workAnswer.answerId) {
      lifestyle.work = String(this.getOptionValue('q12', workAnswer.answerId));
    }
    
    // Activity level (q13)
    const activityAnswer = this.getAnswerForQuestion('q13');
    if (activityAnswer && activityAnswer.answerId) {
      lifestyle.activity = String(this.getOptionValue('q13', activityAnswer.answerId));
    }
    
    // Seasonal preference (q14)
    const seasonAnswer = this.getAnswerForQuestion('q14');
    if (seasonAnswer && seasonAnswer.answerId) {
      lifestyle.preferredSeason = String(this.getOptionValue('q14', seasonAnswer.answerId));
    }
    
    // Layering preference (q15)
    const layeringAnswer = this.getAnswerForQuestion('q15');
    if (layeringAnswer && layeringAnswer.answerId) {
      lifestyle.layering = String(this.getOptionValue('q15', layeringAnswer.answerId));
    }
    
    return lifestyle;
  }
  
  /**
   * Get shopping habits (q17)
   */
  private getShoppingHabits(): Record<string, string> {
    const shopping: Record<string, string> = {};
    
    // Shopping frequency (q17)
    const frequencyAnswer = this.getAnswerForQuestion('q17');
    if (frequencyAnswer && frequencyAnswer.answerId) {
      shopping.frequency = String(this.getOptionValue('q17', frequencyAnswer.answerId));
    }
    
    return shopping;
  }
  
  /**
   * Get gender/category preference (q1)
   */
  private getGenderCategory(): string | null {
    const genderAnswer = this.getAnswerForQuestion('q1');
    if (!genderAnswer || !genderAnswer.answerId) return null;
    
    return String(this.getOptionValue('q1', genderAnswer.answerId));
  }
  
  /**
   * Main function to generate complete user preferences
   */
  public generateUserPreferences(): UserPreferences {
    return {
      stylePreferences: this.getStylePreferences(),
      colorPreferences: this.getColorPreferences(),
      sizePreferences: this.getSizePreferences(),
      priceRange: this.getPriceRange(),
      favoriteRetailers: this.getFavoriteBrands(),
      occasionPreferences: this.getOccasionPreferences(),
      
      // Additional data not in the base UserPreferences type
      // but useful for personalization
      metadata: {
        genderCategory: this.getGenderCategory(),
        patternPreferences: this.getPatternPreferences(),
        fabricPreferences: this.getFabricPreferences(),
        fitPreferences: this.getFitPreferences(),
        celebrityInspiration: this.getCelebrityPreferences(),
        trendApproach: this.getTrendApproach(),
        comfortStyleBalance: this.getComfortStyleBalance(),
        styleGoal: this.getStyleGoal(),
        lifestyle: this.getLifestyleAttributes(),
        shopping: this.getShoppingHabits()
      }
    } as UserPreferences;
  }
  
  /**
   * Generate a user-friendly profile summary
   */
  public generateProfileSummary(): string {
    const gender = this.getGenderCategory();
    const styles = this.getStylePreferences().map(s => s.style).join(', ');
    const colors = this.getColorPreferences().map(c => c.color).join(', ');
    const fits = this.getFitPreferences();
    const budget = this.getPriceRange().target;
    const occasions = this.getOccasionPreferences().join(', ');
    const patterns = this.getPatternPreferences().join(', ');
    const fabrics = this.getFabricPreferences().join(', ');
    const celebrities = this.getCelebrityPreferences().join(', ');
    const goal = this.getStyleGoal();
    
    return `Your style profile is ${styles} with a preference for ${colors} colors${patterns ? ` and ${patterns} patterns` : ''}.
    
You typically shop in the ${gender} section and prefer ${fits.topFit || 'various'} tops and ${fits.bottomFit || 'various'} bottoms.

Your typical budget is around $${budget || '50-100'} per item, and you're looking for clothes suitable for ${occasions || 'everyday wear'}.

You gravitate toward ${fabrics || 'comfortable'} fabrics${celebrities ? ` and are inspired by ${celebrities}` : ''}.

Your current style goal is to ${goal || 'refresh your wardrobe'}.`;
  }
  
  /**
   * Generate initial recommendation categories based on style profile
   */
  public generateRecommendationCategories(): string[] {
    const categories: string[] = [];
    const gender = this.getGenderCategory();
    const stylePrefs = this.getStylePreferences();
    const occasions = this.getOccasionPreferences();
    
    // Basic categories based on gender/category
    if (gender === 'womens' || gender === 'mixed') {
      categories.push('Women\'s Clothing');
    }
    
    if (gender === 'mens' || gender === 'mixed') {
      categories.push('Men\'s Clothing');
    }
    
    if (gender === 'unisex' || gender === 'mixed') {
      categories.push('Unisex Clothing');
    }
    
    // Add categories based on style preferences
    if (stylePrefs.some(s => s.style === 'classic')) {
      categories.push('Classic Essentials');
    }
    
    if (stylePrefs.some(s => s.style === 'minimalist')) {
      categories.push('Minimalist Staples');
    }
    
    if (stylePrefs.some(s => s.style === 'trendy')) {
      categories.push('Trending Now');
    }
    
    if (stylePrefs.some(s => s.style === 'edgy')) {
      categories.push('Statement Pieces');
    }
    
    if (stylePrefs.some(s => s.style === 'sporty')) {
      categories.push('Activewear');
    }
    
    if (stylePrefs.some(s => s.style === 'bohemian')) {
      categories.push('Boho Chic');
    }
    
    // Add occasion-based categories
    if (occasions.includes('casual')) {
      categories.push('Everyday Casual');
    }
    
    if (occasions.includes('work')) {
      categories.push('Workwear');
    }
    
    if (occasions.includes('formal')) {
      categories.push('Formal Attire');
    }
    
    if (occasions.includes('date')) {
      categories.push('Date Night');
    }
    
    // Ensure we have at least some categories
    if (categories.length < 3) {
      categories.push('Recommended For You');
      categories.push('Seasonal Essentials');
    }
    
    return categories;
  }
  
  /**
   * Calculate percentage completion
   */
  public getCompletionPercentage(): number {
    return Math.round((this.answers.length / this.questions.length) * 100);
  }
}

export default StyleQuizResultsProcessor;