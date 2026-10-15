from django.urls import include, path

urlpatterns = [
    path("api/", include("core.urls")),
    path("api/", include("catalog.urls")),
    path("api/", include("purchasing.urls")),
    path("api/", include("sales.urls")),
]
