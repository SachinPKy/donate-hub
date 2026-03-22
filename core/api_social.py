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
        # The frontend usually runs on 5173, but let's try to match the request host
        host = request.get_host().split(':')[0]
        frontend_base = f"{scheme}://{host}:5173"
        
    frontend_url = f"{frontend_base}/social-callback"
    
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)
    
    redirect_url = f"{frontend_url}?access={access_token}&refresh={refresh_token}"
    return redirect(redirect_url)
