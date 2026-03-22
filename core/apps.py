from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        from django.contrib import admin
        admin.site.site_header = "DonateHub Administration"
        admin.site.site_title = "DonateHub Admin Portal"
        admin.site.index_title = "Welcome to DonateHub Administration"
