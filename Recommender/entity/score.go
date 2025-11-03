package entity

// UserScore, veritabanındaki user_scores tablosunu temsil eder.
// Tipler isteğine göre güncellendi.
type UserScore struct {
	UserID           int64   `json:"user_id"`           // string -> int64 (long)
	TechnologyScore  float32 `json:"technology_score"`  // int -> float32
	SportsScore      float32 `json:"sports_score"`      // int -> float32
	ArtScore         float32 `json:"art_score"`         // int -> float32
	MusicScore       float32 `json:"music_score"`       // int -> float32
	ScienceScore     float32 `json:"science_score"`     // int -> float32
	TravelScore      float32 `json:"travel_score"`      // int -> float32
	FoodScore        float32 `json:"food_score"`        // int -> float32
	MovieScore       float32 `json:"movie_score"`       // int -> float32
	BookScore        float32 `json:"book_score"`        // int -> float32
	FashionScore     float32 `json:"fashion_score"`     // int -> float32
	GameScore        float32 `json:"game_score"`        // int -> float32
	NatureScore      float32 `json:"nature_score"`      // int -> float32
	PhotographyScore float32 `json:"photography_score"` // int -> float32
	EducationScore   float32 `json:"education_score"`   // int -> float32
	HealthScore      float32 `json:"health_score"`      
	EconomyScore     float32 `json:"economy_score"`     
}
