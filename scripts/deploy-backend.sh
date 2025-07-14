#!/bin/bash

# Simple Backend and Database Deployment Script

echo "Starting backend and database deployment..."

# Start database
echo "Starting PostgreSQL database..."
cd backend
docker-compose up -d postgres

# Wait for database
echo "Waiting for database to be ready..."
sleep 10

# Install dependencies and build
echo "Installing dependencies..."
npm install

echo "Building backend..."
npm run build

# Start backend
echo "Starting backend server..."
npm start

cd ..