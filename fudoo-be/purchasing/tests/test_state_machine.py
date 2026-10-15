import pytest

from purchasing import services
from purchasing.errors import InvalidTransition
from purchasing.models import Status
from purchasing.state_machine import allowed_actions

pytestmark = pytest.mark.django_db

LEGAL = {
    (Status.DRAFT, "send"): Status.SENT,
    (Status.DRAFT, "cancel"): Status.CANCELLED,
    (Status.SENT, "cancel"): Status.CANCELLED,
    (Status.RECEIVED, "close"): Status.CLOSED,
}
ACTIONS = ["send", "cancel", "close", "deliver_partial", "deliver_full", "explode"]
ILLEGAL = [(s, a) for s in Status for a in ACTIONS if (s, a) not in LEGAL]


@pytest.mark.parametrize(("start", "action"), LEGAL)
def test_legal_manual_transition(order, order_in, start, action):
    order_in(order, start)
    assert services.perform_action(order.id, action).status == LEGAL[(start, action)]
    order.refresh_from_db()
    assert order.status == LEGAL[(start, action)]


@pytest.mark.parametrize(("start", "action"), ILLEGAL)
def test_illegal_manual_transition_is_rejected(order, order_in, start, action):
    order_in(order, start)
    with pytest.raises(InvalidTransition):
        services.perform_action(order.id, action)
    order.refresh_from_db()
    assert order.status == start


@pytest.mark.parametrize(("status", "expected"), [
    (Status.DRAFT, ["send", "cancel"]),
    (Status.SENT, ["cancel"]),
    (Status.RECEIVED, ["close"]),
    (Status.CLOSED, []),
    (Status.CANCELLED, []),
])
def test_allowed_actions(status, expected):
    assert allowed_actions(status) == expected
