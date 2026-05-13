export type MealType = 'breakfast' | 'lunch' | 'dinner'

export interface NutritionProfile {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sugar?: number
  sodium?: number
}

export interface Meal {
  id: string
  planId: string
  day: string
  type: MealType
  name: string
  tags: string[]
  nutrition: NutritionProfile
}

export interface MealPlan {
  id: string
  familyId: string
  weekOf: string
  meals: Meal[]
}