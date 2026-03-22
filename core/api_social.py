from django.shortcuts import redirect
from django.contrib.auth.decorators import login_required
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings

@login_required
def social_auth_callback(request):
    """
    Bridge between django-allauth (session based) and React (JWT based).
    Redirects back to React with JWT tokens in URL after successful social login.
    """
    user = request.user
    refresh = RefreshToken.for_user(user)
    
    # Get frontend URL from settings, fallback to relative if not set
    frontend_base = settings.FRONTEND_URL.rstrip('/')
    
    # DYNAMIC FALLBACK: If empty (local testing), use the current request host (IP address)
    if not frontend_base:
        scheme = 'http' if settings.DEBUG else 'https'
        # Try to detect the correct host and port from the request
        current_host = request.get_host()
        # If accessing via IP, the frontend is usually on the same IP but different port
        host_ip = current_host.split(':')[0]
        # Most common Vite ports are 5173 or 5174
        frontend_base = f"{scheme}://{host_ip}:5173"
        # We could try to detect the port, but 5173 is the primary target. 
        # For now, let's keep it simple but allow the user to see it.
        
    frontend_url = f"{frontend_base}/social-callback"
    
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)
    
    redirect_url = f"{frontend_url}?access={access_token}&refresh={refresh_token}"
    return redirect(redirect_url)
