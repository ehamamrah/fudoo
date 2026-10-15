from purchasing.errors import InvalidTransition
from purchasing.models import Status

SEND = "send"
CANCEL = "cancel"
CLOSE = "close"
DELIVER_PARTIAL = "deliver_partial"
DELIVER_FULL = "deliver_full"

MANUAL_ACTIONS = (SEND, CANCEL, CLOSE)

TRANSITIONS = {
    Status.DRAFT: {SEND: Status.SENT, CANCEL: Status.CANCELLED},
    Status.SENT: {
        CANCEL: Status.CANCELLED,
        DELIVER_PARTIAL: Status.RECEIVED,
        DELIVER_FULL: Status.CLOSED,
    },
    Status.RECEIVED: {
        CLOSE: Status.CLOSED,
        DELIVER_PARTIAL: Status.RECEIVED,
        DELIVER_FULL: Status.CLOSED,
    },
}


def allowed_actions(status):
    return [event for event in TRANSITIONS.get(status, {}) if event in MANUAL_ACTIONS]


def can_receive(status):
    return DELIVER_PARTIAL in TRANSITIONS.get(status, {})


def perform(order, action):
    if action not in MANUAL_ACTIONS:
        raise InvalidTransition(order.status, action)
    _move(order, action)


def record_delivery(order, fully_received):
    _move(order, DELIVER_FULL if fully_received else DELIVER_PARTIAL)


def _move(order, event):
    target = TRANSITIONS.get(order.status, {}).get(event)
    if target is None:
        raise InvalidTransition(order.status, event)
    order.status = target
    order.save(update_fields=["status"])
