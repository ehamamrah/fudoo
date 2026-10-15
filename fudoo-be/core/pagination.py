from urllib.parse import urlsplit, urlunsplit

from rest_framework import pagination

DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 100


def relative(url):
    if url is None:
        return None
    parts = urlsplit(url)
    return urlunsplit(("", "", parts.path, parts.query, ""))


class RelativeLinks:
    page_size = DEFAULT_PAGE_SIZE
    page_size_query_param = "page_size"
    max_page_size = MAX_PAGE_SIZE

    def get_next_link(self):
        return relative(super().get_next_link())

    def get_previous_link(self):
        return relative(super().get_previous_link())


class PageNumberPagination(RelativeLinks, pagination.PageNumberPagination):
    pass


class CursorPagination(RelativeLinks, pagination.CursorPagination):
    """Orders by the model's Meta.ordering, which must be unique and backed by an index."""

    def get_ordering(self, request, queryset, view):
        return tuple(queryset.model._meta.ordering)
