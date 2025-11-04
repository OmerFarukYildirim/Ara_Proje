package entity

// UserScore, veritabanındaki user_scores tablosunu temsil eder.
// Tipler isteğine göre güncellendi.
type UserScore struct {
	UserID           int64   `json:"user_id" redis:"user_id"`
	TechnologyScore  float32 `json:"technology_score" redis:"technology_score"`
	SportsScore      float32 `json:"sports_score" redis:"sports_score"`
	ArtScore         float32 `json:"art_score" redis:"art_score"`
	MusicScore       float32 `json:"music_score" redis:"music_score"`
	ScienceScore     float32 `json:"science_score" redis:"science_score"`
	TravelScore      float32 `json:"travel_score" redis:"travel_score"`
	FoodScore        float32 `json:"food_score" redis:"food_score"`
	MovieScore       float32 `json:"movie_score" redis:"movie_score"`
	BookScore        float32 `json:"book_score" redis:"book_score"`
	FashionScore     float32 `json:"fashion_score" redis:"fashion_score"`
	GameScore        float32 `json:"game_score" redis:"game_score"`
	NatureScore      float32 `json:"nature_score" redis:"nature_score"`
	PhotographyScore float32 `json:"photography_score" redis:"photography_score"`
	EducationScore   float32 `json:"education_score" redis:"education_score"`
	HealthScore      float32 `json:"health_score" redis:"health_score"`
	EconomyScore     float32 `json:"economy_score" redis:"economy_score"`
}
