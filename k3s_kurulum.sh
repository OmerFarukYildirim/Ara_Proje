export DOCKER_USER="omerfarukyildirim"

echo "--- Auth Service Hazırlanıyor ---"
docker build -t $DOCKER_USER/auth-service:v1 ./AuthMikroService
docker push $DOCKER_USER/auth-service:v1

echo "--- Fetcher Service Hazırlanıyor ---"
docker build -t $DOCKER_USER/fetcher-service:v1 ./FetcherMicroService
docker push $DOCKER_USER/fetcher-service:v1

echo "--- Processor Service Hazırlanıyor ---"
docker build -t $DOCKER_USER/processor-service:v1 ./Processor
docker push $DOCKER_USER/processor-service:v1

echo "--- AI Enrichment Service Hazırlanıyor ---"
docker build -t $DOCKER_USER/ai-enrichment-service:v1 ./ai-enrichment
docker push $DOCKER_USER/ai-enrichment-service:v1

echo "--- Content Finder Service Hazırlanıyor ---"
docker build -t $DOCKER_USER/content-finder-service:v1 ./content-finder
docker push $DOCKER_USER/content-finder-service:v1

echo "--- Content Mixer Service Hazırlanıyor ---"
docker build -t $DOCKER_USER/content-mixer-service:v1 ./content-mixer
docker push $DOCKER_USER/content-mixer-service:v1

echo "--- Recommender Service Hazırlanıyor ---"
docker build -t $DOCKER_USER/recommender-service:v1 ./Recommender
docker push $DOCKER_USER/recommender-service:v1