from decimal import Decimal

import pytest

from conftest import order_line
from core.testing import RACE_ROUNDS, outcome_kinds, race
from inventory.tests.ledger import assert_ledger_matches
from sales.models import Order, OrderLine
from sales.services import record_order

pytestmark = pytest.mark.django_db(transaction=True)


def test_two_orders_racing_for_the_last_stock_cannot_both_succeed(fresh_burger, stock_up):
    for round_ in range(RACE_ROUNDS):
        burger, beef, bun = fresh_burger(round_)
        stock_up((beef, "150"), (bun, "1"))
        outcomes = race(
            lambda: record_order(f"a-{round_}", [order_line(burger)]),
            lambda: record_order(f"b-{round_}", [order_line(burger)]),
        )
        assert outcome_kinds(outcomes) == ["InsufficientStock", "tuple"]
        assert OrderLine.objects.filter(menu_item=burger, status="fulfilled").count() == 1
        assert_ledger_matches(beef, bun)
        assert (beef.on_hand, bun.on_hand) == (0, 0)


def test_two_partial_orders_racing_never_fulfil_the_same_stock_twice(fresh_burger, stock_up):
    for round_ in range(RACE_ROUNDS):
        burger, beef, bun = fresh_burger(round_)
        stock_up((beef, "300"), (bun, "2"))
        lines = [order_line(burger), order_line(burger, 2)]
        outcomes = race(lambda: record_order(f"a-{round_}", lines), lambda: record_order(f"b-{round_}", lines))
        assert outcome_kinds(outcomes) == ["tuple", "tuple"]
        assert OrderLine.objects.filter(menu_item=burger, status="fulfilled").count() == 2
        assert_ledger_matches(beef, bun)
        assert (beef.on_hand, bun.on_hand) == (0, 0)


def test_same_external_id_racing_creates_once_and_deducts_once(fresh_burger, stock_up):
    for round_ in range(RACE_ROUNDS):
        burger, beef, bun = fresh_burger(round_)
        stock_up((beef, "150"), (bun, "1"))
        sell = lambda: record_order(f"dup-{round_}", [order_line(burger)])
        outcomes = race(sell, sell)
        assert outcome_kinds(outcomes) == ["tuple", "tuple"]
        assert sorted(created for _, created in outcomes) == [False, True]
        assert len({order.id for order, _ in outcomes}) == 1
        assert_ledger_matches(beef, bun)
        assert beef.on_hand == 0


def test_same_external_id_with_conflicting_lines_racing_records_one(fresh_burger, stock_up):
    for round_ in range(RACE_ROUNDS):
        burger, beef, bun = fresh_burger(round_)
        stock_up((beef, "1000"), (bun, "10"))
        outcomes = race(
            lambda: record_order(f"clash-{round_}", [order_line(burger)]),
            lambda: record_order(f"clash-{round_}", [order_line(burger, 2)]),
        )
        assert outcome_kinds(outcomes) == ["IdempotencyConflict", "tuple"]
        assert Order.objects.filter(external_id=f"clash-{round_}").count() == 1
        assert_ledger_matches(beef, bun)
        assert beef.on_hand in (Decimal("850"), Decimal("700"))
