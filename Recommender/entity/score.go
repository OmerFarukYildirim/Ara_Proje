package entity

// UserScore, veritabanındaki user_scores tablosunu temsil eder.
// Tipler isteğine göre güncellendi.
type UserScore struct {
	UserID             int64   `json:"user_id" redis:"user_id"`
	TechnologyScore    float32 `json:"technology_score" redis:"technology_score"`
	SportsScore        float32 `json:"sports_score" redis:"sports_score"`
	BusinessScore      float32 `json:"business_score" redis:"business_score"`
	ScienceScore       float32 `json:"science_score" redis:"science_score"`
	EntertainmentScore float32 `json:"entertainment_score" redis:"entertainment_score"`
	PoliticsScore      float32 `json:"politics_score" redis:"politics_score"`
	CrimeScore         float32 `json:"crime_score" redis:"crime_score"`
	EnvironmentScore   float32 `json:"environment_score" redis:"environment_score"`
	FoodScore          float32 `json:"food_score" redis:"food_score"`
	LifestyleScore     float32 `json:"lifestyle_score" redis:"lifestyle_score"`
	EducationScore     float32 `json:"education_score" redis:"education_score"`
	HealthScore        float32 `json:"health_score" redis:"health_score"`
	TourismScore       float32 `json:"tourism_score" redis:"tourism_score"`
}
