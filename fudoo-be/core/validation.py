from rest_framework import serializers

MAX_LIST_ITEMS = 100
MAX_PRIMARY_KEY = 2**63 - 1


def reject_duplicates(items, key, message):
    values = [item[key] for item in items]
    if len(values) != len(set(values)):
        raise serializers.ValidationError(message)
    return items


def resolve_references(items, key, queryset):
    found = fetch_all(queryset, [item[key] for item in items])
    return [{**item, key: found[item[key]]} for item in items]


def fetch_all(queryset, ids):
    found = queryset.in_bulk(set(ids))
    missing = sorted(set(ids) - found.keys())
    if missing:
        raise serializers.ValidationError(f"Unknown ids: {missing}.")
    return found


class PrimaryKeyField(serializers.IntegerField):
    """Accepts a bare id; the parent resolves a whole list with one query via resolve_references."""

    def __init__(self, **kwargs):
        super().__init__(min_value=1, max_value=MAX_PRIMARY_KEY, **kwargs)

    def to_representation(self, value):
        return value.pk


class PrimaryKeyListField(serializers.ListField):
    def __init__(self, queryset, **kwargs):
        self.queryset = queryset
        super().__init__(child=PrimaryKeyField(), max_length=MAX_LIST_ITEMS, **kwargs)

    def get_attribute(self, instance):
        return super().get_attribute(instance).all()

    def to_representation(self, data):
        return [item.pk for item in data]

    def to_internal_value(self, data):
        ids = super().to_internal_value(data)
        found = fetch_all(self.queryset, ids)
        return [found[pk] for pk in ids]
