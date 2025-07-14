# Simple Frontend Deployment Script

echo "Starting frontend deployment..."

cd frontend

# Install dependencies
echo "Installing dependencies..."
npm install

# Build and start
echo "Building frontend..."
npm run build

echo "Starting frontend server..."
npm start

cd ..