from django.urls import path

from catalog import views

urlpatterns = [
    path("ingredients/", views.IngredientListCreate.as_view()),
    path("suppliers/", views.SupplierListCreate.as_view()),
    path("suppliers/<int:pk>/", views.SupplierDetail.as_view()),
    path("menu-items/", views.MenuItemListCreate.as_view()),
]
