/**
 * Service Category Enum
 * Categories for agent services
 */

export enum ServiceCategory {
  Development = 0,
  Trading = 1,
  ContentCreation = 2,
  DataAnalysis = 3,
  Gaming = 4,
  Social = 5,
  Finance = 6,
  Education = 7,
  Healthcare = 8,
  Other = 99,
}

export type ServiceCategoryArgs = ServiceCategory
