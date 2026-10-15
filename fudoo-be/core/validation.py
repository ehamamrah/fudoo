from rest_framework import serializers


def reject_duplicates(items, key, message):
    values = [item[key] for item in items]
    if len(values) != len(set(values)):
        raise serializers.ValidationError(message)
    return items
