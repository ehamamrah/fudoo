from decimal import Decimal

import pytest

from core.testing import RACE_ROUNDS, outcome_kinds, race
from inventory.testing import assert_ledger_matches
from sales.models import Sale
from sales.services import record_sale

pytestmark = pytest.mark.django_db(transaction=True)


def test_two_sales_racing_for_last_stock_cannot_both_succeed(fresh_burger, stock_up):
    for round_ in range(RACE_ROUNDS):
        burger, beef, bun = fresh_burger(round_)
        stock_up((beef, "150"), (bun, "1"))
        outcomes = race(
            lambda: record_sale(f"a-{round_}", burger, 1),
            lambda: record_sale(f"b-{round_}", burger, 1),
        )
        assert outcome_kinds(outcomes) == ["InsufficientStock", "tuple"]
        assert Sale.objects.filter(menu_item=burger).count() == 1
        assert_ledger_matches(beef, bun)
        assert (beef.on_hand, bun.on_hand) == (0, 0)


def test_same_external_id_racing_deducts_once(fresh_burger, stock_up):
    for round_ in range(RACE_ROUNDS):
        burger, beef, bun = fresh_burger(round_)
        stock_up((beef, "1000"), (bun, "10"))
        sell = lambda: record_sale(f"dup-{round_}", burger, 1)
        outcomes = race(sell, sell)
        assert outcome_kinds(outcomes) == ["tuple", "tuple"]
        assert sorted(created for _, created in outcomes) == [False, True]
        assert len({sale.id for sale, _ in outcomes}) == 1
        assert_ledger_matches(beef)
        assert beef.on_hand == Decimal("850")
