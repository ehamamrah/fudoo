from django.urls import path

from sales import views

urlpatterns = [
    path("sales/", views.SaleListCreate.as_view()),
]
