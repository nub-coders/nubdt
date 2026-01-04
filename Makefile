.PHONY: help build run stop clean test docker-build docker-run docker-stop docker-clean docker-test logs shell

# Variables
DOCKER_IMAGE = nubdb:latest
CONTAINER_NAME = nubdb-server
PORT = 6379

help:
	@echo "NubDB Makefile Commands:"
	@echo ""
	@echo "Local Build:"
	@echo "  make build          - Build NubDB binary"
	@echo "  make run            - Run NubDB in interactive mode"
	@echo "  make server         - Run NubDB in server mode"
	@echo "  make test           - Run tests"
	@echo "  make clean          - Clean build artifacts"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build   - Build Docker image"
	@echo "  make docker-run     - Run Docker container"
	@echo "  make docker-stop    - Stop Docker container"
	@echo "  make docker-clean   - Remove container and image"
	@echo "  make docker-test    - Test Docker container"
	@echo "  make docker-logs    - View container logs"
	@echo "  make docker-shell   - Open shell in container"
	@echo ""
	@echo "Docker Compose:"
	@echo "  make compose-up     - Start with docker-compose"
	@echo "  make compose-down   - Stop docker-compose"
	@echo "  make compose-logs   - View docker-compose logs"
	@echo ""
	@echo "Kubernetes:"
	@echo "  make k8s-deploy     - Deploy to Kubernetes"
	@echo "  make k8s-delete     - Delete from Kubernetes"
	@echo "  make k8s-status     - Check Kubernetes status"
	@echo "  make k8s-logs       - View Kubernetes logs"

# Local build targets
build:
	./zig-linux-x86_64-0.13.0/zig build -Doptimize=ReleaseFast

run: build
	./zig-out/bin/nubdt

server: build
	./zig-out/bin/nubdt --server $(PORT)

test:
	./test.sh

clean:
	rm -rf zig-out .zig-cache *.aof

# Docker targets
docker-build:
	docker build -t $(DOCKER_IMAGE) .

docker-run: docker-build
	docker run -d \
		--name $(CONTAINER_NAME) \
		-p $(PORT):6379 \
		-v nubdb-data:/data \
		$(DOCKER_IMAGE)
	@echo "NubDB running on port $(PORT)"
	@sleep 2
	@docker logs $(CONTAINER_NAME)

docker-stop:
	docker stop $(CONTAINER_NAME) || true
	docker rm $(CONTAINER_NAME) || true

docker-clean: docker-stop
	docker rmi $(DOCKER_IMAGE) || true
	docker volume rm nubdb-data || true

docker-test: docker-run
	@echo "Testing Docker container..."
	@sleep 2
	@echo "SET test docker_value" | nc localhost $(PORT)
	@echo "GET test" | nc localhost $(PORT)
	@echo "SIZE" | nc localhost $(PORT)
	@$(MAKE) docker-stop

docker-logs:
	docker logs -f $(CONTAINER_NAME)

docker-shell:
	docker exec -it $(CONTAINER_NAME) sh

# Docker Compose targets
compose-up:
	docker network create web 2>/dev/null || true
	docker-compose up -d
	@echo "NubDB started with docker-compose on 'web' network"
	@sleep 2
	@docker-compose logs

compose-down:
	docker-compose down

compose-logs:
	docker-compose logs -f

compose-restart:
	docker-compose restart

# Kubernetes targets
k8s-deploy:
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/deployment.yaml
	@echo "NubDB deployed to Kubernetes"

k8s-delete:
	kubectl delete -f k8s/deployment.yaml || true
	kubectl delete -f k8s/namespace.yaml || true

k8s-status:
	kubectl get all -n nubdb

k8s-logs:
	kubectl logs -n nubdb -l app=nubdb -f

k8s-port-forward:
	kubectl port-forward -n nubdb svc/nubdb-service 6379:6379

# Utility targets
benchmark: build
	./zig-linux-x86_64-0.13.0/zig build bench -Doptimize=ReleaseFast

demo: server

format:
	@echo "Zig handles formatting automatically during build"

all: clean build test
