export DOCKER_USER="omerfarukyildirim"

echo "--- Auth Service Hazırlanıyor ---"
docker build -t $DOCKER_USER/auth-service:v1 ./AuthMikroService
docker push $DOCKER_USER/auth-service:v1

echo "--- Fetcher Service Hazırlanıyor ---"
docker build -t $DOCKER_USER/fetcher-service:latest ./FetcherMicroService
docker push $DOCKER_USER/fetcher-service:latest

echo "--- Processor Service Hazırlanıyor ---"
docker build -t $DOCKER_USER/processor-service:latest ./Processor
docker push $DOCKER_USER/processor-service:latest

echo "--- AI Enrichment Service Hazırlanıyor ---"
docker build -t $DOCKER_USER/ai-enrichment-service:latest ./ai-enrichment
docker push $DOCKER_USER/ai-enrichment-service:latest

echo "--- Content Finder Service Hazırlanıyor ---"
docker build -t $DOCKER_USER/content-finder-service:latest ./content-finder
docker push $DOCKER_USER/content-finder-service:latest

echo "--- Content Mixer Service Hazırlanıyor ---"
docker build -t $DOCKER_USER/content-mixer-service:latest ./content-mixer
docker push $DOCKER_USER/content-mixer-service:latest

echo "--- Recommender Service Hazırlanıyor ---"
docker build -t $DOCKER_USER/recommender-service:latest ./Recommender
docker push $DOCKER_USER/recommender-service:latest
