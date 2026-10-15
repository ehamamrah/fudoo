from core.errors import DomainError


class InsufficientStock(DomainError):
    def __init__(self, shortages):
        super().__init__(
            "insufficient_stock", "Not enough stock to cover this sale.", shortages=shortages
        )
