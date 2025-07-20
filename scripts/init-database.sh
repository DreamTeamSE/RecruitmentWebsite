#!/bin/bash

# Database Initialization Script for Recruitment Backend
# Initializes PostgreSQL database with required schema and test data

set -euo pipefail

echo "🗄️ Initializing Recruitment Backend Database..."

# Variables with defaults
DB_HOST=${DB_HOST:-recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-postgres}
DB_USER=${DB_USER:-admin}
DB_PASSWORD=${DB_PASSWORD:-}
SCHEMA_DIR=${SCHEMA_DIR:-/home/ec2-user/recruitment-app/backend/postgres-init}

# Check if password is provided
if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Database password not provided"
    echo "Usage: DB_PASSWORD=your_password ./init-database.sh"
    echo "Or set environment variable DB_PASSWORD"
    exit 1
fi

# Check if schema directory exists
if [ ! -d "$SCHEMA_DIR" ]; then
    echo "❌ Schema directory not found: $SCHEMA_DIR"
    exit 1
fi

# Test database connection
test_connection() {
    echo "🔍 Testing database connection..."
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" >/dev/null 2>&1; then
        echo "✅ Database connection successful"
        return 0
    else
        echo "❌ Database connection failed"
        echo "Please check your connection parameters:"
        echo "  Host: $DB_HOST"
        echo "  Port: $DB_PORT"
        echo "  Database: $DB_NAME"
        echo "  User: $DB_USER"
        return 1
    fi
}

# Run SQL file
run_sql_file() {
    local sql_file="$1"
    local description="$2"
    
    echo "📝 Running $description..."
    echo "   File: $sql_file"
    
    if [ ! -f "$sql_file" ]; then
        echo "❌ SQL file not found: $sql_file"
        return 1
    fi
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$sql_file"; then
        echo "✅ $description completed successfully"
        return 0
    else
        echo "❌ $description failed"
        return 1
    fi
}

# Check if tables exist
check_existing_tables() {
    echo "🔍 Checking for existing tables..."
    
    local existing_tables
    existing_tables=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    " 2>/dev/null | tr -d ' ' | grep -v '^$' || true)
    
    if [ -n "$existing_tables" ]; then
        echo "⚠️ Found existing tables:"
        echo "$existing_tables" | sed 's/^/  - /'
        
        read -p "🤔 Do you want to continue? This may affect existing data (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ Database initialization cancelled"
            exit 1
        fi
    else
        echo "✅ No existing tables found, proceeding with fresh initialization"
    fi
}

# Create database backup
create_backup() {
    echo "💾 Creating database backup before initialization..."
    
    local backup_file="/tmp/recruitment_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$backup_file" 2>/dev/null; then
        echo "✅ Backup created: $backup_file"
        echo "📁 You can restore with: psql -h $DB_HOST -U $DB_USER -d $DB_NAME < $backup_file"
    else
        echo "⚠️ Backup creation failed (this is normal for empty databases)"
    fi
}

# Initialize schema
initialize_schema() {
    echo "🏗️ Initializing database schema..."
    
    # Array of SQL files in order
    local sql_files=(
        "01_user.sql"
        "02_applications.sql"
        "03_interview.sql"
        "04_add_email_to_form_entries.sql"
        "05_make_email_required.sql"
    )
    
    local descriptions=(
        "User and Staff tables"
        "Application and Form tables"
        "Interview management tables"
        "Email field additions"
        "Email requirements"
    )
    
    # Execute each SQL file
    for i in "${!sql_files[@]}"; do
        local sql_file="$SCHEMA_DIR/${sql_files[$i]}"
        local description="${descriptions[$i]}"
        
        if ! run_sql_file "$sql_file" "$description"; then
            echo "❌ Schema initialization failed at: ${sql_files[$i]}"
            exit 1
        fi
    done
    
    echo "✅ Database schema initialized successfully"
}

# Verify schema
verify_schema() {
    echo "🔍 Verifying database schema..."
    
    local expected_tables=(
        "staff"
        "applicants"
        "forms"
        "questions"
        "formentries"
        "answers"
        "staffapplicationnotes"
        "interviews"
    )
    
    local missing_tables=()
    
    for table in "${expected_tables[@]}"; do
        if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND LOWER(table_name) = LOWER('$table');
        " 2>/dev/null | grep -q 1; then
            missing_tables+=("$table")
        fi
    done
    
    if [ ${#missing_tables[@]} -eq 0 ]; then
        echo "✅ All expected tables are present"
        
        # Show table counts
        echo "📊 Table row counts:"
        for table in "${expected_tables[@]}"; do
            local count
            count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ' || echo "0")
            echo "  $table: $count rows"
        done
    else
        echo "❌ Missing tables: ${missing_tables[*]}"
        return 1
    fi
}

# Test basic operations
test_operations() {
    echo "🧪 Testing basic database operations..."
    
    # Test staff table
    local staff_count
    staff_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM staff;" 2>/dev/null | tr -d ' ')
    
    if [ "$staff_count" -gt 0 ]; then
        echo "✅ Staff table has $staff_count records"
    else
        echo "⚠️ Staff table is empty"
    fi
    
    # Test forms table
    echo "📝 Testing form creation..."
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        INSERT INTO forms (staff_id, title, description) 
        SELECT id, 'Test Form', 'Database initialization test form' 
        FROM staff LIMIT 1
        ON CONFLICT DO NOTHING;
    " >/dev/null 2>&1; then
        echo "✅ Form creation test successful"
    else
        echo "⚠️ Form creation test failed (may be expected if no staff exists)"
    fi
}

# Show database info
show_database_info() {
    echo "📋 Database Information:"
    echo "  Host: $DB_HOST"
    echo "  Port: $DB_PORT"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    echo "  Schema Location: $SCHEMA_DIR"
    
    # Show database size
    local db_size
    db_size=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT pg_size_pretty(pg_database_size('$DB_NAME'));
    " 2>/dev/null | tr -d ' ' || echo "Unknown")
    echo "  Database Size: $db_size"
    
    # Show connection limit
    local max_connections
    max_connections=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SHOW max_connections;" 2>/dev/null | tr -d ' ' || echo "Unknown")
    echo "  Max Connections: $max_connections"
}

# Main execution
main() {
    echo "🚀 Starting database initialization for Recruitment Backend"
    
    # Test connection first
    if ! test_connection; then
        exit 1
    fi
    
    # Show database info
    show_database_info
    
    # Check for existing tables
    check_existing_tables
    
    # Create backup if tables exist
    create_backup
    
    # Initialize schema
    initialize_schema
    
    # Verify schema
    if verify_schema; then
        echo "✅ Schema verification passed"
    else
        echo "❌ Schema verification failed"
        exit 1
    fi
    
    # Test basic operations
    test_operations
    
    echo "✅ Database initialization completed successfully!"
    echo "🎯 Your recruitment backend database is ready for use"
    
    # Show next steps
    echo ""
    echo "📋 Next Steps:"
    echo "  1. Update your application's DATABASE_URL environment variable"
    echo "  2. Start your backend application"
    echo "  3. Test the /health endpoint to verify connectivity"
    echo "  4. Register your first staff member through the frontend"
}

# Cleanup function
cleanup() {
    echo "🧹 Cleaning up temporary files..."
    # Add any cleanup tasks here
}

# Set trap for cleanup
trap cleanup EXIT

# Check if running with required parameters
if [ $# -gt 0 ] && [ "$1" = "--help" ]; then
    echo "Database Initialization Script for Recruitment Backend"
    echo ""
    echo "Usage: ./init-database.sh"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST      Database host (default: recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com)"
    echo "  DB_PORT      Database port (default: 5432)"
    echo "  DB_NAME      Database name (default: postgres)"
    echo "  DB_USER      Database user (default: admin)"
    echo "  DB_PASSWORD  Database password (REQUIRED)"
    echo "  SCHEMA_DIR   Schema files directory (default: backend/postgres-init)"
    echo ""
    echo "Example:"
    echo "  DB_PASSWORD=mypassword ./init-database.sh"
    exit 0
fi

# Run main function
main "$@"