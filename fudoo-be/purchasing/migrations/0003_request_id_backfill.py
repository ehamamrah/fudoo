from django.db import migrations, models


def backfill_request_ids(apps, schema_editor):
    for model_name in ("PurchaseOrder", "Delivery"):
        model = apps.get_model("purchasing", model_name)
        rows = list(model.objects.filter(request_id__isnull=True))
        for row in rows:
            row.request_id = f"legacy-{model_name.lower()}-{row.pk}"
        model.objects.bulk_update(rows, ["request_id"])


class Migration(migrations.Migration):

    dependencies = [
        ('purchasing', '0002_purchaseorder_purchase_order_status_valid'),
    ]

    operations = [
        migrations.AddField(
            model_name='purchaseorder',
            name='request_id',
            field=models.CharField(max_length=64, null=True),
        ),
        migrations.AddField(
            model_name='delivery',
            name='request_id',
            field=models.CharField(max_length=64, null=True),
        ),
        migrations.RunPython(backfill_request_ids, migrations.RunPython.noop),
    ]
