class DomainError(Exception):
    def __init__(self, code, detail, **extra):
        super().__init__(detail)
        self.code = code
        self.detail = detail
        self.extra = extra

    def as_dict(self):
        return {"code": self.code, "detail": self.detail, **self.extra}
