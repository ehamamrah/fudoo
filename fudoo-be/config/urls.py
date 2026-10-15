from django.urls import include, path

urlpatterns = [
    path("api/", include("catalog.urls")),
    path("api/", include("purchasing.urls")),
]
