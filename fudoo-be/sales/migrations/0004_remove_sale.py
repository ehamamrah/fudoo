from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0003_orders'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Sale',
        ),
    ]
