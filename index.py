from donatehub.wsgi import application

# Vercel's Python runtime searches for a variable named 'app' or 'application'
# Using 'app' here as it's a common convention for Vercel
app = application
