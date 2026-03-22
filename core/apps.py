from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        from django.contrib import admin
        admin.site.site_header = "DonateHub Administration"
        admin.site.site_title = "DonateHub Admin Portal"
        admin.site.index_title = "Welcome to DonateHub Administration"

        # DYNAMIC SITE SYNC (Local testing only)
        # Ensures allauth doesn't fail due to domain mismatch when testing on phone via IP
        from django.conf import settings
        if settings.DEBUG:
            try:
                from django.contrib.sites.models import Site
                import socket
                # Detect local IP
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
                s.close()
                
                # Update the default site
                site = Site.objects.get_or_create(id=settings.SITE_ID)[0]
                if site.domain != local_ip:
                    site.domain = local_ip
                    site.name = f"DonateHub Local ({local_ip})"
                    site.save()
            except Exception:
                pass
