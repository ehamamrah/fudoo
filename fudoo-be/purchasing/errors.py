from core.errors import DomainError


class InvalidTransition(DomainError):
    def __init__(self, status, action):
        super().__init__(
            "invalid_transition", f"Cannot {action} a purchase order that is {status}."
        )


class PONotReceivable(DomainError):
    def __init__(self, status):
        super().__init__(
            "po_not_receivable", f"Cannot receive a delivery on a purchase order that is {status}."
        )


class OverReceipt(DomainError):
    def __init__(self, line, quantity):
        super().__init__(
            "over_receipt",
            f"Line {line.id} ({line.ingredient.name}): receiving {quantity:.3f} "
            f"exceeds outstanding {line.quantity_outstanding:.3f}.",
        )
