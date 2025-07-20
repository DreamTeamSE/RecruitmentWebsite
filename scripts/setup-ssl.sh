#!/bin/bash

# SSL Certificate Setup Script for Recruitment Backend
# Sets up Let's Encrypt SSL certificates with automatic renewal

set -euo pipefail

echo "🔒 Setting up SSL certificates for Recruitment Backend..."

# Variables
DOMAIN=${DOMAIN:-recruitment-backend.dreamteameng.org}
EMAIL=${SSL_EMAIL:-internal.software@dreamteameng.org}
WEBROOT="/var/www/html"
NGINX_CONFIG="/etc/nginx/sites-available/recruitment-backend"
NGINX_ENABLED="/etc/nginx/sites-enabled/recruitment-backend"

# Install certbot if not present
install_certbot() {
    echo "📦 Installing Certbot..."
    
    if command -v certbot >/dev/null 2>&1; then
        echo "✅ Certbot already installed"
        return 0
    fi
    
    # Install EPEL repository for Amazon Linux 2
    sudo amazon-linux-extras install epel -y
    
    # Install certbot
    sudo yum install -y certbot python3-certbot-nginx
    
    echo "✅ Certbot installed successfully"
}

# Setup nginx for initial SSL challenge
setup_nginx_http() {
    echo "⚙️ Setting up nginx for HTTP validation..."
    
    # Create webroot directory
    sudo mkdir -p "$WEBROOT"
    sudo chown nginx:nginx "$WEBROOT"
    
    # Create temporary HTTP-only nginx config for cert validation
    sudo tee /etc/nginx/sites-available/recruitment-backend-http << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root $WEBROOT;
        try_files \$uri \$uri/ =404;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF

    # Enable the config
    sudo ln -sf /etc/nginx/sites-available/recruitment-backend-http /etc/nginx/sites-enabled/
    
    # Test nginx config
    sudo nginx -t
    
    # Reload nginx
    sudo systemctl reload nginx
    
    echo "✅ Nginx configured for HTTP validation"
}

# Obtain SSL certificate
obtain_certificate() {
    echo "🔒 Obtaining SSL certificate from Let's Encrypt..."
    
    # Run certbot
    sudo certbot certonly \
        --webroot \
        --webroot-path="$WEBROOT" \
        --email "$EMAIL" \
        --agree-tos \
        --non-interactive \
        --domains "$DOMAIN"
    
    if [ $? -eq 0 ]; then
        echo "✅ SSL certificate obtained successfully"
    else
        echo "❌ Failed to obtain SSL certificate"
        exit 1
    fi
}

# Setup nginx with SSL
setup_nginx_ssl() {
    echo "⚙️ Configuring nginx with SSL..."
    
    # Remove HTTP-only config
    sudo rm -f /etc/nginx/sites-enabled/recruitment-backend-http
    
    # Copy the main nginx config with SSL
    sudo cp /home/ec2-user/recruitment-app/scripts/nginx.conf "$NGINX_CONFIG"
    
    # Update domain in config
    sudo sed -i "s/recruitment-backend\.dreamteameng\.org/$DOMAIN/g" "$NGINX_CONFIG"
    
    # Enable the config
    sudo ln -sf "$NGINX_CONFIG" "$NGINX_ENABLED"
    
    # Test nginx config
    sudo nginx -t
    
    # Reload nginx
    sudo systemctl reload nginx
    
    echo "✅ Nginx configured with SSL"
}

# Setup automatic renewal
setup_auto_renewal() {
    echo "🔄 Setting up automatic certificate renewal..."
    
    # Create renewal script
    sudo tee /usr/local/bin/renew-ssl.sh << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script

set -euo pipefail

echo "🔄 Checking SSL certificate renewal..."

# Renew certificates
certbot renew --quiet --no-self-upgrade

# Check if renewal occurred by looking at certificate dates
if [ -f /etc/letsencrypt/live/recruitment-backend.dreamteameng.org/fullchain.pem ]; then
    # Reload nginx if certificate was renewed
    if certbot renew --dry-run >/dev/null 2>&1; then
        echo "✅ SSL certificate is valid"
    else
        echo "🔄 Reloading nginx after certificate renewal"
        systemctl reload nginx
        echo "✅ Nginx reloaded successfully"
    fi
else
    echo "❌ SSL certificate not found"
    exit 1
fi

echo "✅ SSL renewal check completed"
EOF

    # Make script executable
    sudo chmod +x /usr/local/bin/renew-ssl.sh
    
    # Add cron job for automatic renewal (twice daily)
    (crontab -l 2>/dev/null; echo "0 0,12 * * * /usr/local/bin/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1") | crontab -
    
    echo "✅ Automatic renewal configured"
    echo "📅 SSL certificates will be checked for renewal twice daily"
}

# Test SSL setup
test_ssl() {
    echo "🧪 Testing SSL setup..."
    
    # Wait a moment for nginx to fully reload
    sleep 3
    
    # Test HTTPS connection
    if curl -sSf "https://$DOMAIN/health" >/dev/null 2>&1; then
        echo "✅ HTTPS connection successful"
    else
        echo "⚠️ HTTPS connection test failed (may be expected if backend is not running)"
    fi
    
    # Test HTTP redirect
    if curl -sI "http://$DOMAIN" | grep -q "301\|302"; then
        echo "✅ HTTP to HTTPS redirect working"
    else
        echo "⚠️ HTTP to HTTPS redirect test failed"
    fi
    
    # Check certificate validity
    if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" < /dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
        echo "✅ SSL certificate is valid"
        echo "📅 Certificate expiration dates:"
        openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" < /dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null
    else
        echo "⚠️ Could not verify SSL certificate"
    fi
}

# Backup nginx configs
backup_configs() {
    echo "💾 Backing up nginx configurations..."
    
    sudo mkdir -p /etc/nginx/backups
    sudo cp /etc/nginx/nginx.conf "/etc/nginx/backups/nginx.conf.$(date +%Y%m%d_%H%M%S)"
    
    if [ -f "$NGINX_CONFIG" ]; then
        sudo cp "$NGINX_CONFIG" "/etc/nginx/backups/recruitment-backend.$(date +%Y%m%d_%H%M%S)"
    fi
    
    echo "✅ Configurations backed up"
}

# Main execution
main() {
    echo "🚀 Starting SSL setup for domain: $DOMAIN"
    
    # Validate domain
    if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        echo "❌ Invalid domain format: $DOMAIN"
        echo "Usage: DOMAIN=your-domain.com ./setup-ssl.sh"
        exit 1
    fi
    
    # Check if nginx is running
    if ! systemctl is-active --quiet nginx; then
        echo "❌ Nginx is not running. Please start nginx first."
        echo "Run: sudo systemctl start nginx"
        exit 1
    fi
    
    # Backup existing configs
    backup_configs
    
    # Install certbot
    install_certbot
    
    # Setup nginx for HTTP validation
    setup_nginx_http
    
    # Obtain SSL certificate
    obtain_certificate
    
    # Configure nginx with SSL
    setup_nginx_ssl
    
    # Setup automatic renewal
    setup_auto_renewal
    
    # Test SSL setup
    test_ssl
    
    echo "✅ SSL setup completed successfully!"
    echo "🔒 Your site is now available at: https://$DOMAIN"
    echo "📜 Certificate location: /etc/letsencrypt/live/$DOMAIN/"
    echo "🔄 Auto-renewal is configured and will run twice daily"
    echo "📋 Check renewal status with: sudo certbot certificates"
}

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    echo "❌ This script should not be run as root. Run with sudo when needed."
    exit 1
fi

# Run main function
main "$@"