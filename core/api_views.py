from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
import logging

logger = logging.getLogger(__name__)
from django.contrib.auth.models import User
from .models import Donation, DonationImage, DonationTracking
from .serializers import (
    UserSerializer, RegisterSerializer, DonationSerializer
)

class LoggingTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        logger.info(f"Login attempt for user: {username}")
        print(f"DEBUG: Login attempt for user: {username}")
        
        # Test authentication manually here to see if it works within the view context
        from django.contrib.auth import authenticate
        password = request.data.get('password')
        auth_user = authenticate(username=username, password=password)
        print(f"DEBUG: Internal authenticate() result for {username}: {auth_user}")
        
        response = super().post(request, *args, **kwargs)
        if response.status_code != 200:
            logger.warning(f"Login failed for user: {username} - {response.data}")
            print(f"DEBUG: Login failed for {username}: {response.data}")
        else:
            print(f"DEBUG: Login success for {username}")
        return response


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

from django.core.mail import send_mail
from django.conf import settings

class DonationListCreateView(generics.ListCreateAPIView):
    serializer_class = DonationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Donation.objects.filter(donor=self.request.user)

    def perform_create(self, serializer):
        donation = serializer.save(donor=self.request.user)
        # Handle images if provided in request.FILES
        images = self.request.FILES.getlist('images')
        for image in images:
            DonationImage.objects.create(donation=donation, image=image)
        # Create tracking entry
        DonationTracking.objects.create(donation=donation)

        # Send emails
        try:
            from_email = getattr(settings, 'EMAIL_HOST_USER', None)
            
            # 1. Donor confirmation email
            if self.request.user.email:
                send_mail(
                    subject="Donation Received - DonateHub",
                    message=(
                        f"Hello {self.request.user.username},\n\n"
                        f"We have received your donation request.\n\n"
                        f"Category: {donation.category}\n"
                        f"Location: {donation.area}\n"
                        f"Pickup Date: {donation.pickup_date}\n\n"
                        f"Track it here: {settings.FRONTEND_URL or 'https://' + self.request.get_host()}/tracking/{donation.id}\n\n"
                        f"Regards,\nDonateHub Team"
                    ),
                    from_email=from_email,
                    recipient_list=[self.request.user.email],
                    fail_silently=True,
                )

            # 2. Admin notification email (Donation Submission Alert)
            if from_email:
                send_mail(
                    subject=f"New Donation Submission: {donation.category}",
                    message=(
                        f"Admin Alert: A new donation has been submitted.\n\n"
                        f"Donor: {self.request.user.username} ({self.request.user.email})\n"
                        f"Category: {donation.category}\n"
                        f"Area: {donation.area}\n"
                        f"District: {donation.district}\n"
                        f"Pickup Date: {donation.pickup_date}\n"
                        f"Receipt: {donation.receipt_number}\n\n"
                        f"Manage it in the admin dashboard."
                    ),
                    from_email=from_email,
                    recipient_list=[from_email],
                    fail_silently=True,
                )
        except Exception as e:
            logger.error(f"Failed to send donation emails: {e}")
            pass

class DonationDetailView(generics.RetrieveAPIView):
    serializer_class = DonationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Donation.objects.filter(donor=self.request.user)

class UserDetailView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user
class AdminStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        
        stats = {
            "total": Donation.objects.count(),
            "pending": Donation.objects.filter(status='SUBMITTED').count(),
            "approved": Donation.objects.filter(status='CONFIRMED').count(),
            "completed": Donation.objects.filter(status='COMPLETED').count(),
            "recent": DonationSerializer(Donation.objects.all().order_by('-created_at')[:10], many=True).data
        }
        return Response(stats)
