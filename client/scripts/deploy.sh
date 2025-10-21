#!/bin/bash

# GMShooter v2 Deployment Script
# This script helps deploy the frontend and backend components

set -e

echo "🚀 Starting GMShooter v2 Deployment..."

# Check if required tools are installed
check_requirements() {
    echo "📋 Checking requirements..."
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is not installed. Please install Node.js and npm."
        exit 1
    fi
    
    if ! command -v supabase &> /dev/null; then
        echo "❌ Supabase CLI is not installed. Installing..."
        npm install -g supabase
    fi
    
    if ! command -v firebase &> /dev/null; then
        echo "❌ Firebase CLI is not installed. Installing..."
        npm install -g firebase-tools
    fi
    
    echo "✅ All requirements met"
}

# Setup environment variables
setup_env() {
    echo "🔧 Setting up environment..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            echo "📝 Created .env file from .env.example"
            echo "⚠️  Please update the environment variables in .env before continuing"
            echo "Press Enter to continue or Ctrl+C to exit..."
            read -r
        else
            echo "❌ .env.example file not found"
            exit 1
        fi
    fi
    
    echo "✅ Environment setup complete"
}

# Deploy Supabase backend
deploy_supabase() {
    echo "🗄️  Deploying Supabase backend..."
    
    cd supabase
    
    # Check if Supabase is linked
    if ! supabase status &> /dev/null; then
        echo "🔗 Linking to Supabase project..."
        supabase link
    fi
    
    # Push database schema
    echo "📊 Pushing database schema..."
    supabase db push
    
    # Deploy Edge Functions
    echo "⚡ Deploying Edge Functions..."
    supabase functions deploy --no-verify-jwt
    
    # Set secrets
    if [ -n "$ROBOFLOW_API_KEY" ]; then
        echo "🔐 Setting Roboflow API key..."
        supabase secrets set ROBOFLOW_API_KEY="$ROBOFLOW_API_KEY"
    fi
    
    cd ..
    echo "✅ Supabase deployment complete"
}

# Build and deploy frontend
deploy_frontend() {
    echo "🎨 Building and deploying frontend..."
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    npm install
    
    # Build the application
    echo "🔨 Building application..."
    npm run build
    
    # Deploy to Firebase Hosting
    echo "🌐 Deploying to Firebase Hosting..."
    firebase deploy --only hosting
    
    echo "✅ Frontend deployment complete"
}

# Run tests
run_tests() {
    echo "🧪 Running tests..."
    
    if [ -f "package.json" ] && grep -q "test" package.json; then
        npm test -- --watchAll=false
    else
        echo "⚠️  No tests found"
    fi
    
    echo "✅ Tests complete"
}

# Main deployment flow
main() {
    echo "🎯 GMShooter v2 Deployment Script"
    echo "=================================="
    
    check_requirements
    setup_env
    
    # Ask what to deploy
    echo "What would you like to deploy?"
    echo "1) Backend (Supabase) only"
    echo "2) Frontend only"
    echo "3) Both (recommended)"
    echo "4) Run tests only"
    echo "5) Full deployment with tests"
    
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1)
            deploy_supabase
            ;;
        2)
            deploy_frontend
            ;;
        3)
            deploy_supabase
            deploy_frontend
            ;;
        4)
            run_tests
            ;;
        5)
            run_tests
            deploy_supabase
            deploy_frontend
            ;;
        *)
            echo "❌ Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Update your environment variables if not already done"
    echo "2. Test the application at your Firebase Hosting URL"
    echo "3. Monitor the Supabase dashboard for any issues"
    echo "4. Check the Edge Functions logs for debugging"
    echo ""
    echo "Useful commands:"
    echo "- View Supabase logs: supabase functions logs"
    echo "- View database: supabase db studio"
    echo "- Local development: npm start"
}

# Handle script arguments
case "${1:-}" in
    "supabase")
        check_requirements
        setup_env
        deploy_supabase
        ;;
    "frontend")
        check_requirements
        setup_env
        deploy_frontend
        ;;
    "test")
        run_tests
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  supabase   Deploy Supabase backend only"
        echo "  frontend   Deploy frontend only"
        echo "  test       Run tests only"
        echo "  help       Show this help message"
        echo ""
        echo "If no command is provided, the interactive deployment wizard will start."
        ;;
    *)
        main
        ;;
esac