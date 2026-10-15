from django.urls import path

from purchasing import views

urlpatterns = [
    path("purchase-orders/", views.PurchaseOrderListCreate.as_view()),
    path("purchase-orders/<int:pk>/", views.PurchaseOrderDetail.as_view()),
    path("purchase-orders/<int:pk>/actions/", views.PurchaseOrderActions.as_view()),
    path("purchase-orders/<int:pk>/deliveries/", views.PurchaseOrderDeliveries.as_view()),
]
