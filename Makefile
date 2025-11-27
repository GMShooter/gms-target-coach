.PHONY: up down build clean test

up:
	docker-compose up -d

down:
	docker-compose down

build:
	docker-compose build

clean:
	docker-compose down -v
	rm -rf __pycache__

test:
	python verify_deployment.py
